'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BarChart3, CloudUpload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSimpleFileUpload } from '@/hooks/useSimpleFileUpload'
import { useSimpleFileProcessing } from '@/hooks/useSimpleFileProcessing'

interface OnboardingPageProps {
  onFileProcessed: (data: any) => void
}

export function OnboardingPageSimple({ onFileProcessed }: OnboardingPageProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Hooks simplificados
  const fileUpload = useSimpleFileUpload()
  const fileProcessing = useSimpleFileProcessing()

  // Procesar automáticamente después del upload
  useEffect(() => {
    if (fileUpload.uploadedFile && !fileProcessing.isProcessing) {
      fileProcessing.processFile(fileUpload.uploadedFile)
    }
  }, [fileUpload.uploadedFile, fileProcessing.isProcessing])

  // Notificar cuando esté completo
  useEffect(() => {
    if (fileProcessing.result) {
      toast.success('¡Archivo procesado correctamente!')
    }
  }, [fileProcessing.result])

  // Estados derivados
  const isUploading = fileUpload.isUploading
  const uploadProgress = fileUpload.progress
  const isProcessing = fileProcessing.isProcessing
  const processingProgress = fileProcessing.progress
  const isCompleted = !!fileProcessing.result
  const hasError = !!fileUpload.error || !!fileProcessing.error
  const errorMessage = fileUpload.error || fileProcessing.error
  const previewData = fileProcessing.result?.previewData

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file)
    
    const result = await fileUpload.uploadFile(file)
    
    if (!result) {
      toast.error(fileUpload.error || 'Error al subir archivo')
    } else {
      toast.success('¡Archivo subido a Supabase!')
    }
  }

  const handleGenerateDashboard = () => {
    if (fileProcessing.result) {
      onFileProcessed({
        fileName: selectedFile?.name,
        uploadedFile: fileUpload.uploadedFile,
        processingResult: fileProcessing.result,
        previewData: fileProcessing.result.previewData,
        stats: fileProcessing.result.stats,
        insights: fileProcessing.result.insights
      })
    }
  }

  const resetFile = () => {
    setSelectedFile(null)
    fileUpload.reset()
    fileProcessing.reset()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center space-x-2 justify-center mb-8">
          <BarChart3 className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-gray-800">SmartDash</span>
          <span className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded-full">v2.0 Simple</span>
        </div>

        <Card className="shadow-xl border border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
              Sube tu archivo de datos
            </CardTitle>
            <p className="text-gray-600">
              Versión simplificada - Solo Storage + Procesamiento
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Área de drag & drop */}
            <Card
              className={cn(
                "border-2 border-dashed transition-colors cursor-pointer",
                isDragOver ? "border-primary bg-primary/5" : "border-gray-300",
                selectedFile && "border-green-300 bg-green-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isUploading && !isProcessing) {
                  document.getElementById('file-upload')?.click()
                }
              }}
            >
              <CardContent className="flex flex-col items-center justify-center py-12">
                {!selectedFile ? (
                  <>
                    <CloudUpload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">Arrastra y suelta tu archivo aquí</p>
                    <p className="text-sm text-gray-500 mb-4">o</p>
                    <Button>Selecciona un archivo</Button>
                    <p className="text-xs text-gray-500 mt-2">
                      CSV y Excel (.xlsx, .xls) - Máximo 10MB
                    </p>
                  </>
                ) : (
                  <div className="text-center w-full">
                    <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    {!isCompleted && !hasError && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          resetFile()
                        }}
                        className="mt-2"
                      >
                        Cambiar archivo
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />

            {/* Progreso de upload */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo a Supabase Storage...
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Progreso de procesamiento */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando datos...
                  </span>
                  <span className="text-sm font-medium text-orange-600">
                    {processingProgress}%
                  </span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            {/* Error */}
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Error al procesar archivo</p>
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => selectedFile && handleFileUpload(selectedFile)}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            )}

            {/* Vista previa completada */}
            {isCompleted && previewData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-green-800 font-medium">¡Archivo procesado con éxito!</p>
                    <p className="text-green-600 text-sm">
                      {fileProcessing.result?.stats.totalRows} filas, {fileProcessing.result?.stats.totalColumns} columnas
                    </p>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {fileProcessing.result?.headers.map((header) => {
                          const columnType = fileProcessing.result?.stats.detectedTypes[header]
                          return (
                            <th key={header} className="px-4 py-3 text-left">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-700">{header}</span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {columnType}
                                </span>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 3).map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 last:border-b-0">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-3 text-gray-600">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Botón generar dashboard */}
            <Button
              onClick={handleGenerateDashboard}
              disabled={!isCompleted}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isCompleted ? '🚀 Generar Dashboard' : 'Generar Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}