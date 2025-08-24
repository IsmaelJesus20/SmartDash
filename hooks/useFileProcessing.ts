'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DataFile, DataSchema } from '@/lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ProcessingResult {
  schema: DataSchema
  previewData: any[]
  stats: {
    totalRows: number
    totalColumns: number
    detectedTypes: Record<string, string>
  }
}

interface ProcessingState {
  isProcessing: boolean
  progress: number
  error: string | null
  result: ProcessingResult | null
}

interface ColumnInfo {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url'
  nullable: boolean
  sample_values: string[]
}

export function useFileProcessing() {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null
  })

  // Detectar tipo de columna basado en los valores
  const detectColumnType = useCallback((values: string[]): 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url' => {
    const nonEmptyValues = values.filter(v => v && v.trim() !== '')
    if (nonEmptyValues.length === 0) return 'text'

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailCount = nonEmptyValues.filter(v => emailRegex.test(v)).length
    if (emailCount / nonEmptyValues.length > 0.8) return 'email'

    // URL
    const urlRegex = /^https?:\/\/.+\..+/
    const urlCount = nonEmptyValues.filter(v => urlRegex.test(v)).length
    if (urlCount / nonEmptyValues.length > 0.8) return 'url'

    // Boolean
    const booleanValues = ['true', 'false', '1', '0', 'sí', 'no', 'yes', 'no']
    const booleanCount = nonEmptyValues.filter(v => 
      booleanValues.includes(v.toLowerCase())
    ).length
    if (booleanCount / nonEmptyValues.length > 0.8) return 'boolean'

    // Number
    const numberCount = nonEmptyValues.filter(v => {
      // Permitir números con comas como separadores de miles
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

  // Procesar archivo CSV
  const processCSV = useCallback((fileContent: string): Promise<{ data: any[], headers: string[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`Error al procesar CSV: ${results.errors[0].message}`))
            return
          }
          
          const headers = results.meta.fields || []
          resolve({
            data: results.data as any[],
            headers
          })
        },
        error: (error) => {
          reject(new Error(`Error al parsear CSV: ${error.message}`))
        }
      })
    })
  }, [])

  // Procesar archivo Excel
  const processExcel = useCallback((fileContent: ArrayBuffer): { data: any[], headers: string[] } => {
    const workbook = XLSX.read(fileContent, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convertir a JSON con headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
    }) as any[][]

    if (jsonData.length === 0) {
      throw new Error('El archivo Excel está vacío')
    }

    const headers = jsonData[0] as string[]
    const data = jsonData.slice(1).map(row => {
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = row[index] || ''
      })
      return obj
    })

    return { data, headers }
  }, [])

  const processFile = useCallback(async (dataFile: DataFile): Promise<ProcessingResult | null> => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      result: null
    }))

    try {
      // Actualizar estado del archivo a 'processing' - intentar diferentes campos
      try {
        await supabase
          .from('data_files')
          .update({ 
            status: 'processing',
            processing_status: 'processing'
          })
          .eq('id', dataFile.id)
      } catch (updateError) {
        console.log('⚠️ No se pudo actualizar estado a processing:', updateError)
        // Continuar sin actualizar estado si falla
      }

      setState(prev => ({ ...prev, progress: 20 }))

      // Descargar archivo de Supabase Storage - probar diferentes campos de path
      let fileBlob: Blob | null = null
      let downloadError: any = null

      // Intentar con diferentes nombres de campo para la ruta
      const pathFields = ['file_path', 'path', 'name']
      
      for (const field of pathFields) {
        if (dataFile[field]) {
          const { data, error } = await supabase.storage
            .from('data-files')
            .download(dataFile[field])
          
          if (!error && data) {
            fileBlob = data
            break
          } else {
            downloadError = error
            console.log(`❌ Fallo descarga con campo ${field}:`, error.message)
          }
        }
      }

      if (!fileBlob) {
        throw new Error(`Error al descargar archivo: ${downloadError?.message || 'No se pudo obtener el archivo'}`)
      }

      setState(prev => ({ ...prev, progress: 40 }))

      let parsedData: { data: any[], headers: string[] }

      // Procesar según el tipo de archivo
      if (dataFile.file_type === 'text/csv') {
        const fileContent = await fileBlob.text()
        parsedData = await processCSV(fileContent)
      } else {
        // Excel files
        const arrayBuffer = await fileBlob.arrayBuffer()
        parsedData = processExcel(arrayBuffer)
      }

      setState(prev => ({ ...prev, progress: 60 }))

      // Detectar esquema automáticamente
      const columns: ColumnInfo[] = parsedData.headers.map(header => {
        const columnValues = parsedData.data
          .map(row => String(row[header] || ''))
          .slice(0, 100) // Analizar solo las primeras 100 filas para eficiencia

        const detectedType = detectColumnType(columnValues)
        const sampleValues = [...new Set(columnValues.filter(v => v.trim() !== ''))].slice(0, 5)
        const hasNulls = columnValues.some(v => !v || v.trim() === '')

        return {
          name: header,
          type: detectedType,
          nullable: hasNulls,
          sample_values: sampleValues
        }
      })

      setState(prev => ({ ...prev, progress: 80 }))

      // Guardar esquema en la base de datos
      const { data: schemaData, error: schemaError } = await supabase
        .from('data_schemas')
        .insert({
          file_id: dataFile.id,
          project_id: dataFile.project_id,
          schema: columns,
          row_count: parsedData.data.length,
          column_count: parsedData.headers.length
        })
        .select()
        .single()

      if (schemaError) {
        throw new Error(`Error al guardar esquema: ${schemaError.message}`)
      }

      // Actualizar archivo como procesado
      await supabase
        .from('data_files')
        .update({
          status: 'processed',
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          rows_count: parsedData.data.length,
          columns_count: parsedData.headers.length
        })
        .eq('id', dataFile.id)

      setState(prev => ({ ...prev, progress: 100 }))

      const result: ProcessingResult = {
        schema: schemaData,
        previewData: parsedData.data.slice(0, 10), // Primeras 10 filas para preview
        stats: {
          totalRows: parsedData.data.length,
          totalColumns: parsedData.headers.length,
          detectedTypes: columns.reduce((acc, col) => {
            acc[col.name] = col.type
            return acc
          }, {} as Record<string, string>)
        }
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        result
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar archivo'
      
      // Marcar archivo como fallido
      await supabase
        .from('data_files')
        .update({
          status: 'failed',
          processing_status: 'failed',
          error_message: errorMessage
        })
        .eq('id', dataFile.id)

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }))

      return null
    }
  }, [detectColumnType, processCSV, processExcel])

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