'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SimpleUploadState {
  isUploading: boolean
  progress: number
  error: string | null
  uploadedFile: {
    fileName: string
    publicUrl: string
    uploadPath: string
  } | null
}

export function useSimpleFileUpload() {
  const [state, setState] = useState<SimpleUploadState>({
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

      // Generar nombre único
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${fileExtension}`

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('data-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`)
      }

      setState(prev => ({ ...prev, progress: 75 }))

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('data-files')
        .getPublicUrl(fileName)

      setState(prev => ({ ...prev, progress: 100 }))

      const result = {
        fileName: file.name,
        publicUrl,
        uploadPath: uploadData.path
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadedFile: result
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
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