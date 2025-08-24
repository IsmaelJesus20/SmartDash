'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Menu, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Database, 
  Settings, 
  Bot, 
  Send, 
  Bell, 
  Search,
  User,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartComponent } from '@/components/chart-component'
import { useDashboardGenerator } from '@/hooks/useDashboardGenerator'

interface DashboardPageProps {
  data: any
  onBack: () => void
}

export function DashboardPage({ data, onBack }: DashboardPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isDashboardReady, setIsDashboardReady] = useState(false)
  
  // Hook para generar dashboard automáticamente
  const dashboardGenerator = useDashboardGenerator()

  // Generar dashboard automáticamente al cargar
  useEffect(() => {
    if (data?.schema && data?.previewData && data?.fileName && !isDashboardReady) {
      dashboardGenerator.generateDashboard(
        data.schema,
        data.previewData,
        data.fileName
      ).then((result) => {
        if (result) {
          setIsDashboardReady(true)
        }
      })
    }
  }, [data, isDashboardReady])

  // Generar métricas a partir de los datos reales
  const generateMetricsFromData = () => {
    if (!data?.previewData || !data?.stats) {
      return []
    }

    const metrics = [
      {
        title: "Total de Registros",
        value: data.stats.totalRows?.toLocaleString() || "0",
        change: 0,
        changeText: "Dataset completo"
      },
      {
        title: "Columnas",
        value: data.stats.totalColumns?.toString() || "0", 
        change: 0,
        changeText: "Variables analizadas"
      }
    ]

    // Buscar columnas numéricas para métricas adicionales
    const numericColumns = Object.entries(data.stats.detectedTypes || {})
      .filter(([_, type]) => type === 'number')
      .map(([name]) => name)

    if (numericColumns.length > 0 && data.previewData.length > 0) {
      const firstNumericCol = numericColumns[0]
      const values = data.previewData
        .map(row => parseFloat(row[firstNumericCol]) || 0)
        .filter(val => !isNaN(val))
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / values.length
        
        metrics.push({
          title: `Total ${firstNumericCol}`,
          value: sum.toLocaleString('es-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }),
          change: 0,
          changeText: "Suma total"
        })

        metrics.push({
          title: `Promedio ${firstNumericCol}`,
          value: avg.toLocaleString('es-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }),
          change: 0,
          changeText: "Valor medio"
        })
      }
    }

    return metrics
  }

  const metrics = generateMetricsFromData()

  // Generar datos para gráficos de Chart.js a partir de la configuración
  const generateChartData = (chart: any, previewData: any[]) => {
    if (!previewData || previewData.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const colors = [
      'rgba(59, 130, 246, 0.8)',   // blue
      'rgba(16, 185, 129, 0.8)',   // green
      'rgba(245, 158, 11, 0.8)',   // yellow
      'rgba(239, 68, 68, 0.8)',    // red
      'rgba(139, 92, 246, 0.8)',   // purple
      'rgba(236, 72, 153, 0.8)'    // pink
    ]

    try {
      if (chart.type === 'pie' || chart.type === 'doughnut') {
        // Para gráficos circulares - agrupar por una columna y contar
        const groupedData: Record<string, number> = {}
        previewData.forEach(row => {
          const key = String(row[chart.xAxis] || 'Sin categoría')
          groupedData[key] = (groupedData[key] || 0) + 1
        })

        return {
          labels: Object.keys(groupedData),
          datasets: [{
            data: Object.values(groupedData),
            backgroundColor: colors,
            borderColor: '#fff',
            borderWidth: 2
          }]
        }
      } else if (chart.type === 'bar' || chart.type === 'line') {
        // Para gráficos de barras/líneas
        if (chart.yAxis && chart.aggregation) {
          const groupedData: Record<string, number[]> = {}
          
          previewData.forEach(row => {
            const key = String(row[chart.xAxis] || 'Sin categoría')
            const value = parseFloat(row[chart.yAxis]) || 0
            
            if (!groupedData[key]) groupedData[key] = []
            groupedData[key].push(value)
          })

          const aggregatedData: Record<string, number> = {}
          Object.entries(groupedData).forEach(([key, values]) => {
            switch (chart.aggregation) {
              case 'sum':
                aggregatedData[key] = values.reduce((a, b) => a + b, 0)
                break
              case 'avg':
                aggregatedData[key] = values.reduce((a, b) => a + b, 0) / values.length
                break
              case 'count':
                aggregatedData[key] = values.length
                break
              case 'min':
                aggregatedData[key] = Math.min(...values)
                break
              case 'max':
                aggregatedData[key] = Math.max(...values)
                break
              default:
                aggregatedData[key] = values.reduce((a, b) => a + b, 0)
            }
          })

          return {
            labels: Object.keys(aggregatedData),
            datasets: [{
              label: `${chart.aggregation.toUpperCase()} de ${chart.yAxis}`,
              data: Object.values(aggregatedData),
              backgroundColor: chart.type === 'line' ? 'rgba(59, 130, 246, 0.1)' : colors[0],
              borderColor: colors[0],
              borderRadius: chart.type === 'bar' ? 5 : 0,
              fill: chart.type === 'line',
              tension: chart.type === 'line' ? 0.3 : 0
            }]
          }
        } else {
          // Solo contar por categoría
          const groupedData: Record<string, number> = {}
          previewData.forEach(row => {
            const key = String(row[chart.xAxis] || 'Sin categoría')
            groupedData[key] = (groupedData[key] || 0) + 1
          })

          return {
            labels: Object.keys(groupedData),
            datasets: [{
              label: 'Cantidad',
              data: Object.values(groupedData),
              backgroundColor: chart.type === 'line' ? 'rgba(59, 130, 246, 0.1)' : colors[0],
              borderColor: colors[0],
              borderRadius: chart.type === 'bar' ? 5 : 0,
              fill: chart.type === 'line',
              tension: chart.type === 'line' ? 0.3 : 0
            }]
          }
        }
      } else if (chart.type === 'scatter') {
        // Para gráficos de dispersión
        if (chart.xAxis && chart.yAxis) {
          const scatterData = previewData.map(row => ({
            x: parseFloat(row[chart.xAxis]) || 0,
            y: parseFloat(row[chart.yAxis]) || 0
          })).filter(point => !isNaN(point.x) && !isNaN(point.y))

          return {
            datasets: [{
              label: `${chart.xAxis} vs ${chart.yAxis}`,
              data: scatterData,
              backgroundColor: colors[0],
              borderColor: colors[0],
              pointRadius: 4
            }]
          }
        }
      }

      // Fallback para otros tipos
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [1],
          backgroundColor: colors[0]
        }]
      }

    } catch (error) {
      console.error('Error generating chart data:', error)
      return {
        labels: ['Error'],
        datasets: [{
          data: [1],
          backgroundColor: 'rgba(239, 68, 68, 0.8)'
        }]
      }
    }
  }

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // Aquí iría la lógica para enviar el mensaje al chat
      console.log('Mensaje enviado:', chatMessage)
      setChatMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-gray-800 text-white fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300",
          // Móvil
          "md:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop
          "md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          // Ancho base
          "w-64"
        )}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-700">
          <div className={cn(
            "flex items-center space-x-2 overflow-hidden transition-opacity duration-300",
            sidebarCollapsed ? "md:opacity-0" : "opacity-100"
          )}>
            <BarChart3 className="h-6 w-6 flex-shrink-0" />
            <span className="text-xl font-bold whitespace-nowrap">SmartDash</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navegación */}
        <nav className={cn(
          "flex-1 px-4 py-6 space-y-2 transition-opacity duration-300",
          sidebarCollapsed ? "md:opacity-0" : "opacity-100"
        )}>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium bg-gray-900 rounded-lg">
            <BarChart3 className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className={cn(sidebarCollapsed && "md:hidden")}>Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg">
            <Database className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className={cn(sidebarCollapsed && "md:hidden")}>Datos</span>
          </a>
          <button 
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg"
          >
            <Bot className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className={cn(sidebarCollapsed && "md:hidden")}>Chat IA</span>
          </button>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg">
            <Settings className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className={cn(sidebarCollapsed && "md:hidden")}>Configuración</span>
          </a>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm h-20 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-gray-600 hover:text-gray-900"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Dashboard - {data?.fileName || 'Datos'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setChatOpen(true)}
              className="bg-primary hover:bg-primary/90 flex items-center space-x-2"
            >
              <Bot className="h-5 w-5" />
              <span className="hidden sm:inline">Preguntar a la IA</span>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </header>

        {/* Contenido del dashboard */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-8">
          {/* Generación de Dashboard con IA */}
          {dashboardGenerator.isGenerating && (
            <Card className="bg-white mb-8">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-blue-500 animate-pulse" />
                    <h3 className="text-lg font-semibold text-gray-900">Generando Dashboard con IA</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {dashboardGenerator.progress < 50 ? 'Analizando datos...' : 
                       dashboardGenerator.progress < 75 ? 'Generando visualizaciones...' : 
                       'Guardando configuración...'}
                    </span>
                    <span className="font-medium">{dashboardGenerator.progress}%</span>
                  </div>
                  <Progress value={dashboardGenerator.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights de IA */}
          {dashboardGenerator.dashboard?.insights && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-5 w-5" />
                  Insights Inteligentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardGenerator.dashboard.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-blue-800 text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-gray-500">{metric.title}</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{metric.value}</p>
                  <p className={cn(
                    "mt-1 text-sm flex items-center text-gray-600"
                  )}>
                    {metric.changeText}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráficos generados con IA */}
          {dashboardGenerator.dashboard?.charts ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {dashboardGenerator.dashboard.charts.map((chart, index) => (
                <Card 
                  key={chart.id} 
                  className={cn(
                    "bg-white",
                    chart.position.w > 4 && "lg:col-span-2",
                    chart.position.w > 8 && "xl:col-span-3"
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      {chart.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{chart.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ChartComponent 
                        type={chart.type}
                        data={generateChartData(chart, data.previewData)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Gráficos de placeholder mientras se genera
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando visualizaciones...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">La IA está analizando tus datos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detectando patrones...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Creando insights automáticamente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Panel de Chat IA */}
      {chatOpen && (
        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out sm:w-96">
          {/* Header del chat */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Asistente IA</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mensajes del chat */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Mensaje inicial del bot */}
            <div className="flex items-start gap-3">
              <div className="bg-gray-800 p-2 rounded-full text-white flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                <p className="text-sm text-gray-800">
                  ¡Hola! ¿Qué te gustaría saber sobre tus datos?
                </p>
              </div>
            </div>

            {/* Mensaje del usuario de ejemplo */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-primary text-white p-3 rounded-lg rounded-br-none">
                <p className="text-sm">
                  ¿Cuál fue mi mejor mes en ventas?
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>

            {/* Respuesta del bot con gráfico */}
            <div className="flex items-start gap-3">
              <div className="bg-gray-800 p-2 rounded-full text-white flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                <p className="text-sm text-gray-800 mb-3">
                  Tu mejor mes fue Junio, con €25,000 en ventas.
                </p>
                <div className="bg-white p-2 rounded-md border">
                  <div className="h-32">
                    <ChartComponent 
                      type="bar"
                      data={{
                        labels: ['Abr', 'May', 'Jun'],
                        datasets: [{
                          data: [19000, 23000, 25000],
                          backgroundColor: 'rgba(16, 185, 129, 0.8)',
                          borderRadius: 3
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { 
                          y: { display: false }, 
                          x: { grid: { display: false } }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input del chat */}
          <div className="p-4 border-t border-gray-200">
            <div className="relative">
              <Input
                type="text"
                placeholder="Escribe tu pregunta..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage()
                  }
                }}
                className="pr-12 bg-gray-100 border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}