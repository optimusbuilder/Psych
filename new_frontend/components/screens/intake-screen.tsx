"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "@/lib/app-context"
import {
  ApiError,
  fetchFamilyQuestionSpec,
  submitFamilyQuestionnaire,
  type FamilyQuestionAnswer,
  type FamilyQuestionAgeTarget,
  type FamilyQuestionResponseInput,
  type FamilyQuestionResponseType,
  type FamilyQuestionSpec,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ProgressIndicator } from "@/components/progress-indicator"
import { ArrowLeft, ArrowRight, AlertTriangle, UserRound } from "lucide-react"

const NODE_LABELS: Record<number, string> = {
  1: "Safety",
  2: "Age & Context",
  3: "Communication",
  4: "Neurodevelopmental",
  5: "Symptoms",
  6: "Functional Impact",
  7: "Instrument Planning",
}

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

const YES_NO_UNCLEAR_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unclear", label: "Unclear" },
  { value: "declined", label: "Prefer not to answer" },
]

const CONFIRM_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unclear", label: "Unclear" },
  { value: "declined", label: "Prefer not to answer" },
]

const MILD_MODERATE_SEVERE_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
]

function mapApiError(error: unknown) {
  const technicalErrorPattern =
    /relation .* does not exist|json parse|unrecognized token|syntax error|<!doctype html>|token </i

  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (body && typeof body.message === "string") {
      if (technicalErrorPattern.test(body.message)) {
        return "The service is still starting up. Please wait a few seconds and try again."
      }
      return body.message
    }
    if (body && typeof body.error === "string") {
      if (technicalErrorPattern.test(body.error)) {
        return "The service is still starting up. Please wait a few seconds and try again."
      }
      return body.error
    }
    if (error.status >= 500) {
      return "We couldn't submit right now. Please try again in a moment."
    }
    return `Request failed (${error.status}). Please try again.`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Something went wrong. Please try again."
}

function parseAgeYears(answer: FamilyQuestionAnswer | undefined) {
  if (!answer) {
    return null
  }

  const raw = answer.kind === "date_or_age" || answer.kind === "open_text" ? answer.value.trim() : ""
  if (!raw) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dob = new Date(raw)
    if (Number.isNaN(dob.getTime())) {
      return null
    }
    const now = new Date()
    let years = now.getUTCFullYear() - dob.getUTCFullYear()
    const monthDelta = now.getUTCMonth() - dob.getUTCMonth()
    if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
      years -= 1
    }
    return years >= 0 && years <= 120 ? years : null
  }

  const ageMatch = raw.match(/\d{1,2}/)
  if (!ageMatch) {
    return null
  }
  const age = Number.parseInt(ageMatch[0], 10)
  return Number.isFinite(age) && age >= 0 && age <= 120 ? age : null
}

function matchesAgeTarget(target: FamilyQuestionAgeTarget, ageYears: number | null) {
  if (target === "all") {
    return true
  }
  if (ageYears === null) {
    return true
  }

  switch (target) {
    case "0-5":
      return ageYears >= 0 && ageYears <= 5
    case "6-12":
      return ageYears >= 6 && ageYears <= 12
    case "12+":
      return ageYears >= 12
    case "13+":
      return ageYears >= 13
    case "13-17":
      return ageYears >= 13 && ageYears <= 17
    case "18-25":
      return ageYears >= 18 && ageYears <= 25
    case "16-30m":
      return ageYears >= 1 && ageYears <= 2
    case "school-age+":
      return ageYears >= 6
    default:
      return true
  }
}

function isYesLike(answer: FamilyQuestionAnswer | undefined) {
  if (!answer) {
    return false
  }
  if (answer.kind !== "yes_no" && answer.kind !== "confirm") {
    return false
  }
  return answer.value === "yes"
}

function isYesOrAmbiguous(answer: FamilyQuestionAnswer | undefined) {
  if (!answer) {
    return false
  }
  if (answer.kind !== "yes_no" && answer.kind !== "confirm") {
    return false
  }
  return answer.value === "yes" || answer.value === "unclear" || answer.value === "declined"
}

function isAnswerComplete(question: FamilyQuestionSpec, answer: FamilyQuestionAnswer | undefined) {
  if (!answer) {
    return false
  }

  switch (question.responseType) {
    case "ack":
      return answer.kind === "ack" && answer.value.trim().length > 0
    case "date_or_age":
      return answer.kind === "date_or_age" && answer.value.trim().length > 0
    case "open_text":
      return answer.kind === "open_text" && answer.value.trim().length > 0
    case "mild_mod_severe":
      return answer.kind === "mild_mod_severe"
    case "confirm":
      return answer.kind === "confirm"
    case "yes_no":
    case "yes_no_unclear":
      return answer.kind === "yes_no"
    default:
      return false
  }
}

function defaultRater(question: FamilyQuestionSpec): "CG" | "PT" {
  if (question.raters.includes("PT") && !question.raters.includes("CG")) {
    return "PT"
  }
  return "CG"
}

function questionInputValue(answer: FamilyQuestionAnswer | undefined, kind: FamilyQuestionResponseType) {
  if (!answer) {
    return ""
  }

  if (kind === "yes_no" || kind === "yes_no_unclear") {
    return answer.kind === "yes_no" ? answer.value : ""
  }
  if (kind === "confirm") {
    return answer.kind === "confirm" ? answer.value : ""
  }
  if (kind === "open_text") {
    return answer.kind === "open_text" ? answer.value : ""
  }
  if (kind === "date_or_age") {
    return answer.kind === "date_or_age" ? answer.value : ""
  }
  if (kind === "mild_mod_severe") {
    return answer.kind === "mild_mod_severe" ? answer.value : ""
  }
  if (kind === "ack") {
    return answer.kind === "ack" ? answer.value : ""
  }

  return ""
}

export function IntakeScreen() {
  const {
    intakeData,
    setIntakeData,
    setCurrentScreen,
    setRecommendation,
    currentStep,
    setCurrentStep,
  } = useApp()

  const [childName, setChildName] = useState(intakeData.childName)
  const [startedAt] = useState(intakeData.startedAt || new Date().toISOString())
  const [questions, setQuestions] = useState<FamilyQuestionSpec[]>([])
  const [answers, setAnswers] = useState<Record<string, FamilyQuestionAnswer>>(() => {
    const initial: Record<string, FamilyQuestionAnswer> = {}
    for (const response of intakeData.responses) {
      initial[response.questionId] = response.answer
    }
    return initial
  })
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadQuestionSpec() {
      setLoading(true)
      setLoadingError(null)
      try {
        const response = await fetchFamilyQuestionSpec()
        if (!isMounted) {
          return
        }
        const sorted = [...response.questions].sort((a, b) => {
          if (a.node !== b.node) {
            return a.node - b.node
          }
          return a.id.localeCompare(b.id)
        })
        setQuestions(sorted)
      } catch (error) {
        if (!isMounted) {
          return
        }
        setLoadingError(mapApiError(error))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadQuestionSpec()

    return () => {
      isMounted = false
    }
  }, [])

  const steps = useMemo(() => {
    const uniqueNodes = new Set<number>()
    for (const question of questions) {
      uniqueNodes.add(question.node)
    }
    const nodes = Array.from(uniqueNodes).sort((a, b) => a - b)
    if (nodes.length === 0) {
      return [1, 2, 3, 4, 5, 6, 7]
    }
    return nodes
  }, [questions])

  useEffect(() => {
    if (currentStep > steps.length - 1) {
      setCurrentStep(steps.length - 1)
    }
  }, [currentStep, setCurrentStep, steps.length])

  const currentNode = steps[Math.min(currentStep, steps.length - 1)]
  const ageYears = parseAgeYears(answers["2.1"])

  const isQuestionVisible = useCallback(
    (question: FamilyQuestionSpec) => {
      const ageMatch = question.ageTargets.some((target) => matchesAgeTarget(target, ageYears))
      if (!ageMatch) {
        return false
      }

      if (!question.branch) {
        return true
      }

      return isYesLike(answers[question.branch.askIfQuestionId])
    },
    [ageYears, answers],
  )

  const nodeQuestions = useMemo(
    () => questions.filter((question) => question.node === currentNode && isQuestionVisible(question)),
    [currentNode, questions, isQuestionVisible],
  )

  const requiredMissing = nodeQuestions.filter(
    (question) => question.required && !isAnswerComplete(question, answers[question.id]),
  )

  const hasImmediateSafetySignal =
    isYesOrAmbiguous(answers["1E.1"]) ||
    isYesOrAmbiguous(answers["1E.3"]) ||
    isYesOrAmbiguous(answers["ASQ-3"]) ||
    isYesOrAmbiguous(answers["ASQ-5"]) ||
    isYesLike(answers["1B.3"]) ||
    isYesLike(answers["1B.4"])

  const canProceed = !loading && (nodeQuestions.length === 0 || requiredMissing.length === 0)

  function updateAnswer(question: FamilyQuestionSpec, answer: FamilyQuestionAnswer | null) {
    setAnswers((previous) => {
      const next = { ...previous }
      if (!answer) {
        delete next[question.id]
        return next
      }
      next[question.id] = answer
      return next
    })
  }

  function renderAnswerInput(question: FamilyQuestionSpec) {
    const currentValue = answers[question.id]

    switch (question.responseType) {
      case "ack": {
        const acknowledged = currentValue?.kind === "ack"
        return (
          <Button
            type="button"
            variant={acknowledged ? "default" : "outline"}
            onClick={() =>
              updateAnswer(
                question,
                acknowledged ? null : { kind: "ack", value: "acknowledged" },
              )
            }
          >
            {acknowledged ? "Acknowledged" : "Acknowledge"}
          </Button>
        )
      }
      case "open_text": {
        return (
          <Textarea
            value={questionInputValue(currentValue, "open_text")}
            onChange={(event) => {
              const value = event.target.value
              if (!value.trim()) {
                updateAnswer(question, null)
                return
              }
              updateAnswer(question, {
                kind: "open_text",
                value,
              })
            }}
            rows={3}
            placeholder="Type your response"
          />
        )
      }
      case "date_or_age": {
        return (
          <Input
            value={questionInputValue(currentValue, "date_or_age")}
            onChange={(event) => {
              const value = event.target.value
              if (!value.trim()) {
                updateAnswer(question, null)
                return
              }
              updateAnswer(question, {
                kind: "date_or_age",
                value,
              })
            }}
            placeholder="e.g. 2012-03-14 or 14"
          />
        )
      }
      case "mild_mod_severe": {
        return (
          <RadioGroup
            value={questionInputValue(currentValue, "mild_mod_severe")}
            onValueChange={(value) => {
              updateAnswer(question, {
                kind: "mild_mod_severe",
                value: value as "mild" | "moderate" | "severe",
              })
            }}
            className="grid gap-3 md:grid-cols-3"
          >
            {MILD_MODERATE_SEVERE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <span>{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        )
      }
      case "yes_no":
      case "yes_no_unclear":
      case "confirm": {
        const options =
          question.responseType === "yes_no"
            ? YES_NO_OPTIONS
            : question.responseType === "confirm"
              ? CONFIRM_OPTIONS
              : YES_NO_UNCLEAR_OPTIONS

        return (
          <RadioGroup
            value={questionInputValue(currentValue, question.responseType)}
            onValueChange={(value) => {
              if (question.responseType === "confirm") {
                updateAnswer(question, {
                  kind: "confirm",
                  value: value as "yes" | "no" | "unclear" | "declined",
                })
                return
              }
              updateAnswer(question, {
                kind: "yes_no",
                value: value as "yes" | "no" | "unclear" | "declined",
              })
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <span>{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        )
      }
      default:
        return null
    }
  }

  async function handleNext() {
    setSubmitError(null)

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      return
    }

    const responses: FamilyQuestionResponseInput[] = []
    for (const question of questions) {
      if (!isQuestionVisible(question)) {
        continue
      }
      const answer = answers[question.id]
      if (!answer) {
        continue
      }
      responses.push({
        questionId: question.id,
        rater: defaultRater(question),
        answer,
        answeredAt: new Date().toISOString(),
      })
    }

    if (responses.length === 0) {
      setSubmitError("Please answer at least one question before submitting.")
      return
    }

    setSubmitting(true)
    try {
      const response = await submitFamilyQuestionnaire({
        childName: childName.trim() || undefined,
        responses,
        metadata: {
          locale: typeof navigator !== "undefined" ? navigator.language : undefined,
          source: "web",
          startedAt,
        },
      })

      setIntakeData({
        childName: childName.trim(),
        responses,
        startedAt,
      })
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
        instrumentPack: response.recommendation.instrumentPack ?? [],
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

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      return
    }
    setCurrentScreen("start")
  }

  return (
    <div className="min-h-screen bg-background bg-texture">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <header className="mb-8">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={18} />
            {currentStep === 0 ? "Back to start" : "Previous section"}
          </button>

          <h1 className="mb-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
            Family Intake Questionnaire
          </h1>
          <p className="text-muted-foreground">
            Complete each node to generate a deterministic referral recommendation.
          </p>
        </header>

        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <CardTitle className="font-serif text-lg">Child Name (optional)</CardTitle>
            </div>
            <CardDescription>Used in summaries and safety messaging only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="First name"
              className="max-w-sm"
            />
          </CardContent>
        </Card>

        <ProgressIndicator
          steps={steps.map((node) => NODE_LABELS[node] ?? "Section")}
          currentStep={Math.min(currentStep, steps.length - 1)}
          className="mb-8"
        />

        {hasImmediateSafetySignal && (
          <Card className="mb-6 border-warning/35 bg-warning/10">
            <CardContent className="flex items-start gap-2 p-4 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <span>
                You marked possible safety concerns. We will show urgent support resources
                immediately after submission.
              </span>
            </CardContent>
          </Card>
        )}

        {loadingError && (
          <Card className="mb-6 border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">{loadingError}</CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              {NODE_LABELS[currentNode] ?? "Section"}
            </CardTitle>
            <CardDescription>
              {requiredMissing.length > 0
                ? `${requiredMissing.length} required question(s) still need a response.`
                : "Everything required in this section is complete."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loading && <p className="text-sm text-muted-foreground">Loading question catalog...</p>}

            {!loading && nodeQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No questions are applicable for this section based on current responses.
              </p>
            )}

            {!loading &&
              nodeQuestions.map((question) => {
                const missingRequired = question.required && !isAnswerComplete(question, answers[question.id])

                return (
                  <div key={question.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{question.label}</p>
                      </div>
                      {question.required && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Required
                        </span>
                      )}
                    </div>

                    <Label className="mb-3 block text-sm text-foreground">{question.prompt}</Label>

                    {renderAnswerInput(question)}

                    {missingRequired && (
                      <p className="mt-2 text-xs text-destructive">This question is required.</p>
                    )}
                  </div>
                )
              })}

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-between gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={handleBack} disabled={submitting} className="gap-2">
            <ArrowLeft size={18} />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || submitting || loading}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {submitting
              ? "Submitting..."
              : currentStep === steps.length - 1
                ? "Get Recommendations"
                : "Continue"}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
