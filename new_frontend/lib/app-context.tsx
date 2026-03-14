"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export type Screen = 'start' | 'intake' | 'results' | 'safety'

export type UrgencyLevel = 'routine' | 'priority' | 'urgent' | 'immediate'

export interface IntakeData {
  // Child Information
  childName: string
  childAge: string
  childGender: string
  
  // Primary Concerns
  primaryConcerns: string[]
  concernDescription: string
  concernDuration: string
  
  // Behavioral Indicators
  moodChanges: string
  sleepIssues: string
  appetiteChanges: string
  socialWithdrawal: string
  academicImpact: string
  
  // Safety Assessment
  selfHarmThoughts: string
  selfHarmBehavior: string
  suicidalIdeation: string
  
  // Family Context
  familyHistory: string
  recentLifeChanges: string
  previousTreatment: string
  
  // Preferences
  preferredApproach: string
  insuranceType: string
}

export interface RecommendationResult {
  specialistType: string
  specialistDescription: string
  urgencyLevel: UrgencyLevel
  rationale: string[]
  nextSteps: string[]
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
  childAge: '',
  childGender: '',
  primaryConcerns: [],
  concernDescription: '',
  concernDuration: '',
  moodChanges: '',
  sleepIssues: '',
  appetiteChanges: '',
  socialWithdrawal: '',
  academicImpact: '',
  selfHarmThoughts: '',
  selfHarmBehavior: '',
  suicidalIdeation: '',
  familyHistory: '',
  recentLifeChanges: '',
  previousTreatment: '',
  preferredApproach: '',
  insuranceType: '',
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
