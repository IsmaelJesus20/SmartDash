'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartComponentProps {
  type: 'bar' | 'line' | 'doughnut'
  data: any
  options?: any
}

export function ChartComponent({ type, data, options }: ChartComponentProps) {
  const chartRef = useRef(null)

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#374151',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      }
    },
    scales: type !== 'doughnut' ? {
      y: {
        beginAtZero: true,
        ticks: { color: '#6B7280' },
        grid: { color: '#E5E7EB' }
      },
      x: {
        ticks: { color: '#6B7280' },
        grid: { display: false }
      }
    } : undefined
  }

  const mergedOptions = { ...defaultOptions, ...options }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar ref={chartRef} data={data} options={mergedOptions} />
      case 'line':
        return <Line ref={chartRef} data={data} options={mergedOptions} />
      case 'doughnut':
        return <Doughnut ref={chartRef} data={data} options={mergedOptions} />
      default:
        return <div>Tipo de gráfico no soportado</div>
    }
  }

  return (
    <div className="w-full h-full">
      {renderChart()}
    </div>
  )
}