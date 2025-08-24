'use client'

import { useState, useCallback } from 'react'

interface N8nProcessingResult {
  previewData: any[]
  headers: string[]
  stats: {
    totalRows: number
    totalColumns: number
    detectedTypes: Record<string, string>
  }
  insights: string[]
  supabaseInfo?: {
    fileId: string
    publicUrl: string
    bucketPath: string
  }
}

interface N8nProcessingState {
  isProcessing: boolean
  progress: number
  error: string | null
  result: N8nProcessingResult | null
}

export function useN8nProcessing() {
  const [state, setState] = useState<N8nProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null
  })

  const pollN8nProcessing = useCallback(async (fileId: string, maxAttempts = 30) => {
    const POLL_INTERVAL = 2000 // 2 segundos
    const N8N_STATUS_URL = process.env.NEXT_PUBLIC_N8N_STATUS_URL || 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook/smartdash-status'
    const N8N_TEST_STATUS_URL = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook-test/smartdash-status'
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔍 Consultando estado n8n (intento ${attempt}/${maxAttempts})...`)
        
        // Intentar primero con URL de producción, luego test
        let response: Response
        let data: any
        
        try {
          response = await fetch(`${N8N_STATUS_URL}?fileId=${fileId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            data = await response.json()
          } else {
            throw new Error(`Status production failed: ${response.status}`)
          }
        } catch (prodError) {
          console.log('⚠️ Status production falló, probando test URL...')
          
          response = await fetch(`${N8N_TEST_STATUS_URL}?fileId=${fileId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            data = await response.json()
          } else {
            throw new Error(`Ambos status webhooks fallaron`)
          }
        }

        if (data.status === 'completed') {
          console.log('✅ Procesamiento completado en n8n:', data)
          return data
        } else if (data.status === 'failed') {
          throw new Error(`Error en n8n: ${data.error || 'Procesamiento fallido'}`)
        } else if (data.status === 'processing') {
          // Actualizar progreso basado en el intento
          const progress = Math.min(90, 20 + (attempt / maxAttempts) * 70)
          setState(prev => ({ ...prev, progress }))
        }
        
        // Esperar antes del siguiente intento
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
        }
        
      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error)
        if (attempt === maxAttempts) {
          throw error
        }
      }
    }
    
    throw new Error('Timeout: El procesamiento en n8n tardó demasiado')
  }, [])

  const processFile = useCallback(async (uploadedFile: {
    fileName: string
    fileId: string
    n8nResponse: any
  }) => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      result: null
    }))

    try {
      console.log('🤖 Iniciando procesamiento con n8n...')
      setState(prev => ({ ...prev, progress: 10 }))

      // Esperar y consultar el estado del procesamiento en n8n
      const n8nResult = await pollN8nProcessing(uploadedFile.fileId)
      
      setState(prev => ({ ...prev, progress: 95 }))

      // Procesar la respuesta de n8n
      const result: N8nProcessingResult = {
        previewData: n8nResult.previewData || [],
        headers: n8nResult.headers || [],
        stats: {
          totalRows: n8nResult.totalRows || 0,
          totalColumns: n8nResult.totalColumns || 0,
          detectedTypes: n8nResult.detectedTypes || {}
        },
        insights: n8nResult.insights || [
          '🤖 Procesado automáticamente por n8n',
          '☁️ Almacenado en Supabase via n8n',
          '🧠 Análisis completado en la nube'
        ],
        supabaseInfo: n8nResult.supabaseInfo
      }

      setState(prev => ({ ...prev, progress: 100 }))

      setState(prev => ({
        ...prev,
        isProcessing: false,
        result
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido en n8n'
      console.error('❌ Error en procesamiento n8n:', error)
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }))
      return null
    }
  }, [pollN8nProcessing])

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