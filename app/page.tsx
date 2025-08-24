'use client'

import { useState } from 'react'
import { OnboardingPageN8n } from '@/components/onboarding-page-n8n'
import { DashboardPage } from '@/components/dashboard-page'

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [uploadedData, setUploadedData] = useState<any>(null)

  const handleFileProcessed = (data: any) => {
    setUploadedData(data)
    setShowDashboard(true)
  }

  const goBackToOnboarding = () => {
    setShowDashboard(false)
    setUploadedData(null)
  }

  if (showDashboard) {
    return <DashboardPage data={uploadedData} onBack={goBackToOnboarding} />
  }

  return <OnboardingPageN8n onFileProcessed={handleFileProcessed} />
}