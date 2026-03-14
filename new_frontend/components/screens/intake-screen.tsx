"use client"

import { useState } from "react"
import { useApp, type IntakeData } from "@/lib/app-context"
import { ApiError, createFamilyReferral } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProgressIndicator } from "@/components/progress-indicator"
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"

const STEPS = [
  "Child Info",
  "Concerns",
  "Behaviors",
  "Safety",
  "Context",
  "Preferences"
]

const concernOptions = [
  { id: "anxiety", label: "Anxiety or excessive worry" },
  { id: "depression", label: "Sadness or depression" },
  { id: "anger", label: "Anger or irritability" },
  { id: "attention", label: "Attention or focus issues" },
  { id: "behavior", label: "Behavioral problems" },
  { id: "trauma", label: "Trauma or past experiences" },
  { id: "social", label: "Social difficulties" },
  { id: "learning", label: "Learning challenges" },
  { id: "eating", label: "Eating or body image concerns" },
  { id: "other", label: "Other concerns" },
]

function mapApiError(error: unknown) {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (body && typeof body.message === "string") {
      return body.message
    }
    return `Request failed (${error.status}). Please try again.`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Something went wrong. Please try again."
}

export function IntakeScreen() {
  const { 
    intakeData, 
    setIntakeData, 
    setCurrentScreen, 
    setRecommendation,
    currentStep,
    setCurrentStep
  } = useApp()
  
  const [localData, setLocalData] = useState<IntakeData>(intakeData)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateField = <K extends keyof IntakeData>(field: K, value: IntakeData[K]) => {
    setLocalData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = async () => {
    setSubmitError(null)

    // Check for immediate safety concerns at step 3 (Safety section)
    if (currentStep === 3) {
      if (localData.suicidalIdeation === 'yes' || localData.selfHarmBehavior === 'current') {
        setIntakeData(localData)
        setCurrentScreen('safety')
        return
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setSubmitting(true)
      try {
        const response = await createFamilyReferral(localData)
        setIntakeData(localData)
        setRecommendation({
          referralId: response.referralId,
          pdfUrl: response.report.pdfUrl,
          specialistType: response.recommendation.specialistType,
          specialistDescription: response.recommendation.specialistDescription,
          urgencyLevel: response.recommendation.urgencyLevel,
          safetyGate: response.recommendation.safetyGate,
          reasonCodes: response.recommendation.reasonCodes,
          aiExplanation: response.recommendation.aiExplanation,
          rationale: response.recommendation.rationale,
          nextSteps: response.recommendation.nextSteps,
        })

        if (response.recommendation.urgencyLevel === "immediate") {
          setCurrentScreen("safety")
        } else {
          setCurrentScreen("results")
        }
      } catch (error) {
        setSubmitError(mapApiError(error))
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      setCurrentScreen('start')
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Child Info
        return localData.childAge && localData.childGender
      case 1: // Concerns
        return localData.primaryConcerns.length > 0 && localData.concernDuration
      case 2: // Behaviors
        return localData.moodChanges && localData.sleepIssues
      case 3: // Safety
        return localData.selfHarmThoughts && localData.suicidalIdeation
      case 4: // Context
        return localData.familyHistory && localData.previousTreatment
      case 5: // Preferences
        return localData.preferredApproach
      default:
        return true
    }
  }

  return (
    <div className="min-h-screen bg-background bg-texture">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">
              {currentStep === 0 ? 'Back to start' : 'Previous section'}
            </span>
          </button>
          
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Tell us about your child
          </h1>
          <p className="text-muted-foreground">
            Your answers help us recommend the most appropriate specialist.
          </p>
        </header>

        {/* Progress */}
        <ProgressIndicator 
          steps={STEPS} 
          currentStep={currentStep} 
          className="mb-8"
        />

        {/* Form Sections */}
        <div className="animate-fade-in" key={currentStep}>
          {currentStep === 0 && (
            <ChildInfoSection data={localData} updateField={updateField} />
          )}
          {currentStep === 1 && (
            <ConcernsSection data={localData} updateField={updateField} />
          )}
          {currentStep === 2 && (
            <BehaviorsSection data={localData} updateField={updateField} />
          )}
          {currentStep === 3 && (
            <SafetySection data={localData} updateField={updateField} />
          )}
          {currentStep === 4 && (
            <ContextSection data={localData} updateField={updateField} />
          )}
          {currentStep === 5 && (
            <PreferencesSection data={localData} updateField={updateField} />
          )}
        </div>

        {submitError && (
          <Card className="mt-6 border-destructive/40 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{submitError}</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={submitting}
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {submitting ? "Submitting..." : currentStep === STEPS.length - 1 ? 'Get Recommendations' : 'Continue'}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Section Components
interface SectionProps {
  data: IntakeData
  updateField: <K extends keyof IntakeData>(field: K, value: IntakeData[K]) => void
}

function ChildInfoSection({ data, updateField }: SectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Child Information</CardTitle>
        <CardDescription>
          Basic information about your child to help personalize recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="childName">Child&apos;s first name (optional)</Label>
          <Input
            id="childName"
            placeholder="First name only"
            value={data.childName}
            onChange={(e) => updateField('childName', e.target.value)}
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            Used only to personalize your results. You can leave this blank.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="childAge">Age range *</Label>
          <Select value={data.childAge} onValueChange={(value) => updateField('childAge', value)}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Select age range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3-5">3-5 years (preschool)</SelectItem>
              <SelectItem value="6-8">6-8 years (early elementary)</SelectItem>
              <SelectItem value="9-11">9-11 years (late elementary)</SelectItem>
              <SelectItem value="12-14">12-14 years (middle school)</SelectItem>
              <SelectItem value="15-17">15-17 years (high school)</SelectItem>
              <SelectItem value="18+">18+ years (young adult)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Gender *</Label>
          <RadioGroup
            value={data.childGender}
            onValueChange={(value) => updateField('childGender', value)}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option.toLowerCase().replace(/ /g, '-')} id={option} />
                <Label htmlFor={option} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function ConcernsSection({ data, updateField }: SectionProps) {
  const toggleConcern = (concernId: string) => {
    const current = data.primaryConcerns
    const updated = current.includes(concernId)
      ? current.filter(c => c !== concernId)
      : [...current, concernId]
    updateField('primaryConcerns', updated)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Primary Concerns</CardTitle>
        <CardDescription>
          What brings you here today? Select all that apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {concernOptions.map((concern) => (
            <label
              key={concern.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <Checkbox
                id={concern.id}
                checked={data.primaryConcerns.includes(concern.id)}
                onCheckedChange={() => toggleConcern(concern.id)}
              />
              <span className="text-foreground">{concern.label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="concernDescription">
            Can you describe what you&apos;ve been noticing? (optional)
          </Label>
          <Textarea
            id="concernDescription"
            placeholder="Share any specific behaviors, situations, or changes you've observed..."
            value={data.concernDescription}
            onChange={(e) => updateField('concernDescription', e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label>How long have these concerns been present? *</Label>
          <RadioGroup
            value={data.concernDuration}
            onValueChange={(value) => updateField('concernDuration', value)}
            className="space-y-2"
          >
            {[
              { value: 'less-than-1-month', label: 'Less than 1 month' },
              { value: '1-3-months', label: '1-3 months' },
              { value: '3-6-months', label: '3-6 months' },
              { value: 'more-than-6-months', label: 'More than 6 months' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function BehaviorsSection({ data, updateField }: SectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Behavioral Observations</CardTitle>
        <CardDescription>
          Help us understand how your child has been doing day-to-day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Changes in mood or emotional regulation *</Label>
          <RadioGroup
            value={data.moodChanges}
            onValueChange={(value) => updateField('moodChanges', value)}
            className="space-y-2"
          >
            {[
              { value: 'none', label: 'No significant changes' },
              { value: 'mild', label: 'Mild - occasional mood swings or irritability' },
              { value: 'moderate', label: 'Moderate - frequent mood changes affecting daily life' },
              { value: 'severe', label: 'Severe - intense emotions that are hard to manage' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`mood-${option.value}`} />
                <Label htmlFor={`mood-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Sleep patterns *</Label>
          <RadioGroup
            value={data.sleepIssues}
            onValueChange={(value) => updateField('sleepIssues', value)}
            className="space-y-2"
          >
            {[
              { value: 'normal', label: 'Sleeping normally' },
              { value: 'difficulty-falling', label: 'Difficulty falling asleep' },
              { value: 'difficulty-staying', label: 'Waking during night or early morning' },
              { value: 'sleeping-more', label: 'Sleeping much more than usual' },
              { value: 'nightmares', label: 'Frequent nightmares or night terrors' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`sleep-${option.value}`} />
                <Label htmlFor={`sleep-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Changes in appetite or eating</Label>
          <RadioGroup
            value={data.appetiteChanges}
            onValueChange={(value) => updateField('appetiteChanges', value)}
            className="space-y-2"
          >
            {[
              { value: 'normal', label: 'No significant changes' },
              { value: 'decreased', label: 'Eating less than usual' },
              { value: 'increased', label: 'Eating more than usual' },
              { value: 'restrictive', label: 'Avoiding certain foods or food groups' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`appetite-${option.value}`} />
                <Label htmlFor={`appetite-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Social interactions</Label>
          <RadioGroup
            value={data.socialWithdrawal}
            onValueChange={(value) => updateField('socialWithdrawal', value)}
            className="space-y-2"
          >
            {[
              { value: 'normal', label: 'Maintaining friendships and social activities' },
              { value: 'some', label: 'Some withdrawal from friends or activities' },
              { value: 'significant', label: 'Significant withdrawal or isolation' },
              { value: 'conflict', label: 'Increased conflicts with peers' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`social-${option.value}`} />
                <Label htmlFor={`social-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Impact on school or learning</Label>
          <RadioGroup
            value={data.academicImpact}
            onValueChange={(value) => updateField('academicImpact', value)}
            className="space-y-2"
          >
            {[
              { value: 'none', label: 'No noticeable impact' },
              { value: 'mild', label: 'Mild - occasional difficulty focusing' },
              { value: 'moderate', label: 'Moderate - grades or performance declining' },
              { value: 'significant', label: 'Significant - major academic difficulties' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`academic-${option.value}`} />
                <Label htmlFor={`academic-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function SafetySection({ data, updateField }: SectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <CardTitle className="font-serif text-xl">Safety Assessment</CardTitle>
            <CardDescription>
              These questions help us ensure we recommend the right level of care. 
              Your honest answers are important.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Confidentiality note:</strong> Your responses 
            are private. If immediate safety concerns are indicated, we will provide crisis 
            resources and recommend emergency services.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Has your child expressed any thoughts of hurting themselves? *</Label>
          <RadioGroup
            value={data.selfHarmThoughts}
            onValueChange={(value) => updateField('selfHarmThoughts', value)}
            className="space-y-2"
          >
            {[
              { value: 'no', label: 'No' },
              { value: 'past', label: 'Yes, in the past but not currently' },
              { value: 'yes', label: 'Yes, currently or recently' },
              { value: 'unsure', label: 'I\'m not sure' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`selfharm-thought-${option.value}`} />
                <Label htmlFor={`selfharm-thought-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Has your child engaged in any self-harm behaviors?</Label>
          <RadioGroup
            value={data.selfHarmBehavior}
            onValueChange={(value) => updateField('selfHarmBehavior', value)}
            className="space-y-2"
          >
            {[
              { value: 'no', label: 'No' },
              { value: 'past', label: 'Yes, in the past but not currently' },
              { value: 'current', label: 'Yes, currently or recently' },
              { value: 'unsure', label: 'I\'m not sure' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`selfharm-behavior-${option.value}`} />
                <Label htmlFor={`selfharm-behavior-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Has your child expressed any thoughts about not wanting to live or suicidal thoughts? *</Label>
          <RadioGroup
            value={data.suicidalIdeation}
            onValueChange={(value) => updateField('suicidalIdeation', value)}
            className="space-y-2"
          >
            {[
              { value: 'no', label: 'No' },
              { value: 'passive', label: 'Passive thoughts (e.g., "I wish I wasn\'t here")' },
              { value: 'past', label: 'Yes, in the past but not currently' },
              { value: 'yes', label: 'Yes, currently or recently' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`suicidal-${option.value}`} />
                <Label htmlFor={`suicidal-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function ContextSection({ data, updateField }: SectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Family & History Context</CardTitle>
        <CardDescription>
          This information helps us understand the full picture and make better recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Is there a family history of mental health conditions? *</Label>
          <RadioGroup
            value={data.familyHistory}
            onValueChange={(value) => updateField('familyHistory', value)}
            className="space-y-2"
          >
            {[
              { value: 'no', label: 'No known family history' },
              { value: 'yes', label: 'Yes, there is family history' },
              { value: 'unsure', label: 'I\'m not sure' },
              { value: 'prefer-not', label: 'Prefer not to say' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`family-${option.value}`} />
                <Label htmlFor={`family-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Recent significant life changes or stressors</Label>
          <Select value={data.recentLifeChanges} onValueChange={(value) => updateField('recentLifeChanges', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No significant changes</SelectItem>
              <SelectItem value="family-change">Family change (divorce, separation, new sibling)</SelectItem>
              <SelectItem value="move">Recent move or school change</SelectItem>
              <SelectItem value="loss">Loss of a loved one or pet</SelectItem>
              <SelectItem value="illness">Illness or medical concerns</SelectItem>
              <SelectItem value="academic">Academic pressure or transition</SelectItem>
              <SelectItem value="social">Social difficulties (bullying, friendship issues)</SelectItem>
              <SelectItem value="other">Other significant change</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Has your child received mental health treatment before? *</Label>
          <RadioGroup
            value={data.previousTreatment}
            onValueChange={(value) => updateField('previousTreatment', value)}
            className="space-y-2"
          >
            {[
              { value: 'no', label: 'No previous treatment' },
              { value: 'yes-helpful', label: 'Yes, and it was helpful' },
              { value: 'yes-not-helpful', label: 'Yes, but it wasn\'t helpful' },
              { value: 'yes-ongoing', label: 'Yes, currently in treatment' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`treatment-${option.value}`} />
                <Label htmlFor={`treatment-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function PreferencesSection({ data, updateField }: SectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Your Preferences</CardTitle>
        <CardDescription>
          Help us tailor our recommendation to what works best for your family.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>What approach feels most comfortable for your family? *</Label>
          <RadioGroup
            value={data.preferredApproach}
            onValueChange={(value) => updateField('preferredApproach', value)}
            className="space-y-2"
          >
            {[
              { value: 'therapy-only', label: 'Prefer to start with therapy only' },
              { value: 'open-medication', label: 'Open to medication if recommended' },
              { value: 'evaluation', label: 'Want a full evaluation before deciding' },
              { value: 'unsure', label: 'Not sure - would like guidance' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`approach-${option.value}`} />
                <Label htmlFor={`approach-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Insurance type</Label>
          <Select value={data.insuranceType} onValueChange={(value) => updateField('insuranceType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select insurance type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private insurance</SelectItem>
              <SelectItem value="medicaid">Medicaid / State insurance</SelectItem>
              <SelectItem value="medicare">Medicare</SelectItem>
              <SelectItem value="military">Military / Tricare</SelectItem>
              <SelectItem value="self-pay">Self-pay / No insurance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This helps us consider provider availability and coverage options.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
