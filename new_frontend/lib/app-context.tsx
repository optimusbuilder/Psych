"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import type { FamilyQuestionResponseInput } from "@/lib/api"

export type Screen = 'start' | 'intake' | 'results' | 'safety'

export type UrgencyLevel = 'routine' | 'priority' | 'urgent' | 'immediate'

export interface IntakeData {
  childName: string
  responses: FamilyQuestionResponseInput[]
  startedAt: string
}

export interface RecommendationResult {
  referralId: string
  pdfUrl: string
  specialistType: string
  specialistDescription: string
  urgencyLevel: UrgencyLevel
  safetyGate?: "clear" | "urgent" | "immediate"
  reasonCodes?: string[]
  aiExplanation?: string | null
  rationale: string[]
  nextSteps: string[]
  instrumentPack: string[]
}

interface AppContextType {
  currentScreen: Screen
  setCurrentScreen: (screen: Screen) => void
  intakeData: IntakeData
  setIntakeData: (data: IntakeData) => void
  recommendation: RecommendationResult | null
  setRecommendation: (result: RecommendationResult | null) => void
  currentStep: number
  setCurrentStep: (step: number) => void
}

const defaultIntakeData: IntakeData = {
  childName: '',
  responses: [],
  startedAt: '',
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('start')
  const [intakeData, setIntakeData] = useState<IntakeData>(defaultIntakeData)
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        intakeData,
        setIntakeData,
        recommendation,
        setRecommendation,
        currentStep,
        setCurrentStep,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
