'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface SimpleProcessingResult {
  previewData: any[]
  headers: string[]
  stats: {
    totalRows: number
    totalColumns: number
    detectedTypes: Record<string, string>
  }
  insights: string[]
}

interface SimpleProcessingState {
  isProcessing: boolean
  progress: number
  error: string | null
  result: SimpleProcessingResult | null
}

export function useSimpleFileProcessing() {
  const [state, setState] = useState<SimpleProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null
  })

  // Detectar tipo de columna
  const detectColumnType = useCallback((values: string[]) => {
    const nonEmptyValues = values.filter(v => v && v.trim() !== '')
    if (nonEmptyValues.length === 0) return 'text'

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (nonEmptyValues.filter(v => emailRegex.test(v)).length / nonEmptyValues.length > 0.8) return 'email'

    // Number
    const numberCount = nonEmptyValues.filter(v => {
      const cleanValue = v.replace(/[,\s]/g, '')
      return !isNaN(Number(cleanValue)) && isFinite(Number(cleanValue))
    }).length
    if (numberCount / nonEmptyValues.length > 0.8) return 'number'

    // Date
    const dateCount = nonEmptyValues.filter(v => {
      const date = new Date(v)
      return !isNaN(date.getTime())
    }).length
    if (dateCount / nonEmptyValues.length > 0.8) return 'date'

    return 'text'
  }, [])

  const processFile = useCallback(async (uploadedFile: {
    fileName: string
    publicUrl: string
    uploadPath: string
  }) => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      result: null
    }))

    try {
      setState(prev => ({ ...prev, progress: 20 }))

      // Descargar archivo de Supabase Storage
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('data-files')
        .download(uploadedFile.uploadPath)

      if (downloadError || !fileBlob) {
        throw new Error(`Error al descargar archivo: ${downloadError?.message}`)
      }

      setState(prev => ({ ...prev, progress: 40 }))

      let headers: string[] = []
      let data: any[] = []

      // Procesar según tipo de archivo
      if (uploadedFile.fileName.endsWith('.csv')) {
        const fileContent = await fileBlob.text()
        const parseResult = await new Promise<{ headers: string[], data: any[] }>((resolve, reject) => {
          Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              resolve({
                headers: results.meta.fields || [],
                data: results.data as any[]
              })
            },
            error: reject
          })
        })
        
        headers = parseResult.headers
        data = parseResult.data
      } else {
        // Excel
        const arrayBuffer = await fileBlob.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as any[][]

        headers = jsonData[0] as string[]
        data = jsonData.slice(1).map(row => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })
      }

      setState(prev => ({ ...prev, progress: 70 }))

      // Detectar tipos
      const detectedTypes: Record<string, string> = {}
      headers.forEach(header => {
        const columnValues = data.map(row => String(row[header] || '')).slice(0, 100)
        detectedTypes[header] = detectColumnType(columnValues)
      })

      // Generar insights
      const insights = [
        `📊 ${data.length} registros analizados exitosamente`,
        `📈 ${headers.length} columnas detectadas con tipos automáticos`,
        `🤖 Tipos detectados: ${Object.values(detectedTypes).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`
      ]

      const numericColumns = Object.entries(detectedTypes).filter(([_, type]) => type === 'number')
      if (numericColumns.length > 0) {
        insights.push(`💰 ${numericColumns.length} columnas numéricas disponibles para cálculos`)
      }

      setState(prev => ({ ...prev, progress: 100 }))

      const result: SimpleProcessingResult = {
        previewData: data.slice(0, 10),
        headers,
        stats: {
          totalRows: data.length,
          totalColumns: headers.length,
          detectedTypes
        },
        insights
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        result
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }))
      return null
    }
  }, [detectColumnType])

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      error: null,
      result: null
    })
  }, [])

  return {
    processFile,
    reset,
    ...state
  }
}