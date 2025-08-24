'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DataFile } from '@/lib/supabase'

interface UploadOptions {
  bucket?: string
  maxFileSize?: number
  allowedTypes?: string[]
  projectId?: string
}

interface UploadResult {
  file: DataFile
  publicUrl: string
  signedUrl?: string
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  uploadedFile: UploadResult | null
}

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  bucket: 'data-files',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  projectId: 'default-project'
}

export function useFileUpload(options: UploadOptions = {}) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFile: null
  })

  const config = { ...DEFAULT_OPTIONS, ...options }

  const validateFile = useCallback((file: File): string | null => {
    if (!config.allowedTypes.includes(file.type)) {
      return 'Tipo de archivo no válido. Solo se permiten archivos CSV y Excel (.xlsx, .xls)'
    }

    if (file.size > config.maxFileSize) {
      return `El archivo es demasiado grande. Máximo ${config.maxFileSize / 1024 / 1024}MB`
    }

    return null
  }, [config.allowedTypes, config.maxFileSize])

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    const validationError = validateFile(file)
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }))
      return null
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      uploadedFile: null
    }))

    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${fileExtension}`

      // Simular progreso de upload
      setState(prev => ({ ...prev, progress: 25 }))

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`)
      }

      setState(prev => ({ ...prev, progress: 50 }))

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(fileName)

      setState(prev => ({ ...prev, progress: 75 }))

      // Guardar metadatos en la base de datos con esquema adaptativo
      let fileData: any = null
      let finalError: any = null

      // Intentar diferentes configuraciones de esquema
      const schemaVariations = [
        // Esquema original del PDF
        {
          project_id: config.projectId === 'default-project' ? null : config.projectId,
          name: fileName,
          original_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type,
          status: 'uploaded',
          processing_status: 'pending'
        },
        // Esquema simplificado sin project_id
        {
          name: fileName,
          original_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type,
          status: 'uploaded',
          processing_status: 'pending'
        },
        // Esquema con 'path' en lugar de 'file_path'
        {
          name: fileName,
          original_name: file.name,
          path: uploadData.path,
          file_size: file.size,
          file_type: file.type,
          status: 'uploaded',
          processing_status: 'pending'
        },
        // Esquema mínimo
        {
          name: fileName,
          original_name: file.name,
          path: uploadData.path,
          size: file.size,
          type: file.type
        },
        // Esquema ultra-simple
        {
          name: fileName,
          original_name: file.name,
          file_path: uploadData.path
        }
      ]

      for (const schema of schemaVariations) {
        const { data, error } = await supabase
          .from('data_files')
          .insert(schema)
          .select()
          .single()

        if (!error && data) {
          fileData = data
          break
        } else {
          finalError = error
          console.log(`❌ Intento fallido:`, error.message)
        }
      }

      if (!fileData) {
        // Si falla la base de datos, eliminar el archivo subido
        await supabase.storage.from(config.bucket).remove([fileName])
        throw new Error(`Error al guardar metadatos después de varios intentos: ${finalError?.message}`)
      }

      setState(prev => ({ ...prev, progress: 100 }))

      const result: UploadResult = {
        file: fileData,
        publicUrl
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadedFile: result
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir archivo'
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }))
      return null
    }
  }, [validateFile, config.bucket, config.projectId])

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