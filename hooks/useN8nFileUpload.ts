'use client'

import { useState, useCallback } from 'react'

interface N8nUploadState {
  isUploading: boolean
  progress: number
  error: string | null
  uploadedFile: {
    fileName: string
    fileId: string
    n8nResponse: any
  } | null
}

export function useN8nFileUpload() {
  const [state, setState] = useState<N8nUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFile: null
  })

  const uploadFile = useCallback(async (file: File) => {
    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      uploadedFile: null
    }))

    try {
      // Validar archivo
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo CSV y Excel.')
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Archivo demasiado grande. Máximo 10MB')
      }

      setState(prev => ({ ...prev, progress: 25 }))

      // Crear FormData para enviar a n8n
      const formData = new FormData()
      formData.append('data', file) // n8n espera 'data' como nombre del campo binario
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('fileType', file.type)
      formData.append('timestamp', Date.now().toString())
      
      console.log('📝 FormData fields:', Array.from(formData.keys()))

      setState(prev => ({ ...prev, progress: 50 }))

      // URL del webhook de n8n (con fallback para testing)
      const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook/smartdash-upload'
      const N8N_TEST_URL = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook-test/smartdash-upload'

      console.log('🚀 Enviando archivo a n8n:', N8N_WEBHOOK_URL)
      console.log('📦 Datos que se envían:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: Date.now()
      })

      // Enviar archivo a n8n (con retry en URL de test si falla)
      let response: Response
      let n8nResponse: any
      
      try {
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
          headers: {
            // No establecer Content-Type para FormData
          }
        })

        if (!response.ok) {
          throw new Error(`Production webhook failed: ${response.status}`)
        }

        n8nResponse = await response.json()
        console.log('✅ Respuesta de n8n (production):', n8nResponse)
        console.log('🔍 Headers de respuesta:', Object.fromEntries(response.headers))
        
      } catch (prodError) {
        console.log('⚠️ Webhook production falló, probando test URL...', prodError)
        
        // Intentar con URL de test
        try {
          response = await fetch(N8N_TEST_URL, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Test webhook failed: ${response.status}`)
          }

          n8nResponse = await response.json()
          console.log('✅ Respuesta de n8n (test):', n8nResponse)
          
        } catch (testError) {
          throw new Error(`Ambos webhooks fallaron. Production: ${prodError}. Test: ${testError}`)
        }
      }

      setState(prev => ({ ...prev, progress: 75 }))
      
      setState(prev => ({ ...prev, progress: 100 }))

      const result = {
        fileName: file.name,
        fileId: n8nResponse.fileId || `n8n_${Date.now()}`,
        n8nResponse
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadedFile: result
      }))

      console.log('✅ Respuesta de n8n:', n8nResponse)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error enviando a n8n:', error)
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFile: null
    })
  }, [])

  return {
    uploadFile,
    reset,
    ...state
  }
}