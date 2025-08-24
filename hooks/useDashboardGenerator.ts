'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DataSchema } from '@/lib/supabase'

interface ChartConfig {
  id: string
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter'
  title: string
  description: string
  xAxis: string
  yAxis?: string
  groupBy?: string
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
  position: {
    x: number
    y: number
    w: number
    h: number
  }
}

interface DashboardConfig {
  title: string
  description: string
  charts: ChartConfig[]
  insights: string[]
}

interface GeneratorState {
  isGenerating: boolean
  progress: number
  error: string | null
  dashboard: DashboardConfig | null
}

export function useDashboardGenerator() {
  const [state, setState] = useState<GeneratorState>({
    isGenerating: false,
    progress: 0,
    error: null,
    dashboard: null
  })

  // Generar insights automáticos basados en el esquema
  const generateInsights = useCallback((schema: any[], previewData: any[]): string[] => {
    const insights: string[] = []
    
    try {
      // Análisis de tipos de columnas
      const numericColumns = schema.filter(col => col.type === 'number')
      const textColumns = schema.filter(col => col.type === 'text')
      const dateColumns = schema.filter(col => col.type === 'date')
      
      if (numericColumns.length > 0) {
        insights.push(`📊 ${numericColumns.length} columnas numéricas detectadas para análisis cuantitativo`)
      }
      
      if (dateColumns.length > 0) {
        insights.push(`📅 ${dateColumns.length} columnas de fecha para análisis temporal`)
      }
      
      // Análisis de datos
      if (previewData.length > 0) {
        const totalRows = previewData.length
        insights.push(`📈 Dataset contiene ${totalRows}+ registros para análisis`)
        
        // Detectar columnas categóricas con pocos valores únicos
        const categoricalCols = schema.filter(col => {
          if (col.type === 'text' && col.sample_values) {
            return col.sample_values.length <= 10 // Si tiene 10 o menos valores únicos
          }
          return false
        })
        
        if (categoricalCols.length > 0) {
          insights.push(`🏷️ ${categoricalCols.length} columnas categóricas perfectas para segmentación`)
        }
      }
      
      // Sugerencias de visualización
      if (numericColumns.length >= 2) {
        insights.push(`📊 Posibles correlaciones entre variables numéricas`)
      }
      
      if (dateColumns.length > 0 && numericColumns.length > 0) {
        insights.push(`📈 Tendencias temporales disponibles para análisis`)
      }
      
    } catch (error) {
      console.error('Error generating insights:', error)
    }
    
    return insights
  }, [])

  // Generar configuración de gráficos automáticamente
  const generateCharts = useCallback((schema: any[], previewData: any[]): ChartConfig[] => {
    const charts: ChartConfig[] = []
    let chartIndex = 0
    
    try {
      const numericColumns = schema.filter(col => col.type === 'number')
      const textColumns = schema.filter(col => col.type === 'text')
      const dateColumns = schema.filter(col => col.type === 'date')
      
      // 1. Gráfico de barras para variables categóricas vs numéricas
      if (textColumns.length > 0 && numericColumns.length > 0) {
        const catCol = textColumns[0]
        const numCol = numericColumns[0]
        
        charts.push({
          id: `chart-${chartIndex++}`,
          type: 'bar',
          title: `${numCol.name} por ${catCol.name}`,
          description: `Distribución de ${numCol.name} segmentado por ${catCol.name}`,
          xAxis: catCol.name,
          yAxis: numCol.name,
          aggregation: 'sum',
          position: { x: 0, y: 0, w: 6, h: 4 }
        })
      }
      
      // 2. Gráfico de línea temporal si hay fechas
      if (dateColumns.length > 0 && numericColumns.length > 0) {
        const dateCol = dateColumns[0]
        const numCol = numericColumns[0]
        
        charts.push({
          id: `chart-${chartIndex++}`,
          type: 'line',
          title: `Evolución de ${numCol.name} en el tiempo`,
          description: `Tendencia temporal de ${numCol.name}`,
          xAxis: dateCol.name,
          yAxis: numCol.name,
          aggregation: 'sum',
          position: { x: 6, y: 0, w: 6, h: 4 }
        })
      }
      
      // 3. Gráfico circular para distribución categórica
      if (textColumns.length > 0) {
        const catCol = textColumns[0]
        
        charts.push({
          id: `chart-${chartIndex++}`,
          type: 'pie',
          title: `Distribución por ${catCol.name}`,
          description: `Proporción de registros por ${catCol.name}`,
          xAxis: catCol.name,
          aggregation: 'count',
          position: { x: 0, y: 4, w: 4, h: 3 }
        })
      }
      
      // 4. Scatter plot si hay 2+ columnas numéricas
      if (numericColumns.length >= 2) {
        charts.push({
          id: `chart-${chartIndex++}`,
          type: 'scatter',
          title: `Correlación ${numericColumns[0].name} vs ${numericColumns[1].name}`,
          description: `Relación entre ${numericColumns[0].name} y ${numericColumns[1].name}`,
          xAxis: numericColumns[0].name,
          yAxis: numericColumns[1].name,
          position: { x: 4, y: 4, w: 4, h: 3 }
        })
      }
      
      // 5. Gráfico de área para tendencias múltiples
      if (dateColumns.length > 0 && numericColumns.length >= 2) {
        charts.push({
          id: `chart-${chartIndex++}`,
          type: 'area',
          title: `Comparativa temporal`,
          description: `Evolución comparada de métricas principales`,
          xAxis: dateColumns[0].name,
          yAxis: numericColumns[1].name,
          aggregation: 'avg',
          position: { x: 8, y: 4, w: 4, h: 3 }
        })
      }
      
    } catch (error) {
      console.error('Error generating charts:', error)
    }
    
    return charts
  }, [])

  const generateDashboard = useCallback(async (
    schema: DataSchema,
    previewData: any[],
    fileName: string
  ): Promise<DashboardConfig | null> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      error: null
    }))

    try {
      setState(prev => ({ ...prev, progress: 25 }))
      
      // Generar insights automáticamente
      const insights = generateInsights(schema.schema, previewData)
      
      setState(prev => ({ ...prev, progress: 50 }))
      
      // Generar configuración de gráficos
      const charts = generateCharts(schema.schema, previewData)
      
      setState(prev => ({ ...prev, progress: 75 }))
      
      // Crear configuración del dashboard
      const dashboardConfig: DashboardConfig = {
        title: `Dashboard - ${fileName}`,
        description: `Dashboard generado automáticamente con ${charts.length} visualizaciones inteligentes`,
        charts,
        insights
      }
      
      // Guardar dashboard en Supabase
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('dashboards')
        .insert({
          project_id: schema.project_id,
          file_id: schema.file_id,
          name: dashboardConfig.title,
          description: dashboardConfig.description,
          config: {
            layout: charts.map(chart => ({
              i: chart.id,
              x: chart.position.x,
              y: chart.position.y,
              w: chart.position.w,
              h: chart.position.h
            })),
            widgets: charts.map(chart => ({
              id: chart.id,
              type: 'chart',
              title: chart.title,
              config: {
                chartType: chart.type,
                xAxis: chart.xAxis,
                yAxis: chart.yAxis,
                aggregation: chart.aggregation,
                groupBy: chart.groupBy
              }
            }))
          },
          is_default: true
        })
        .select()
        .single()

      if (dashboardError) {
        throw new Error(`Error al guardar dashboard: ${dashboardError.message}`)
      }
      
      setState(prev => ({ ...prev, progress: 100 }))
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        dashboard: dashboardConfig
      }))
      
      return dashboardConfig

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }))
      return null
    }
  }, [generateInsights, generateCharts])

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      dashboard: null
    })
  }, [])

  return {
    generateDashboard,
    reset,
    ...state
  }
}