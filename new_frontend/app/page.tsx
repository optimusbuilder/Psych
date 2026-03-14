"use client"

import { AppProvider, useApp } from "@/lib/app-context"
import { StartScreen } from "@/components/screens/start-screen"
import { IntakeScreen } from "@/components/screens/intake-screen"
import { ResultsScreen } from "@/components/screens/results-screen"
import { SafetyScreen } from "@/components/screens/safety-screen"

function AppContent() {
  const { currentScreen } = useApp()

  return (
    <main>
      {currentScreen === 'start' && <StartScreen />}
      {currentScreen === 'intake' && <IntakeScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
      {currentScreen === 'safety' && <SafetyScreen />}
    </main>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
