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
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ProgressIndicator } from "@/components/progress-indicator"
import { ArrowLeft, ArrowRight, AlertTriangle, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const NODE_LABELS: Record<number, string> = {
  1: "Safety",
  2: "About your child",
  3: "Communication",
  4: "Development and learning",
  5: "Emotions and behavior",
  6: "Daily impact",
  7: "Care planning",
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

const OPTION_PILL_CLASSNAME =
  "group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border/55 bg-background/80 px-5 py-3 text-sm text-foreground transition-all duration-200 hover:border-primary/45 hover:bg-primary/[0.04] active:scale-[0.995] has-[button[data-state=checked]]:border-primary/75 has-[button[data-state=checked]]:bg-primary/[0.12] has-[button[data-state=checked]]:shadow-[0_16px_26px_-24px_rgba(14,107,107,0.95)]"

const OPTION_RADIO_CLASSNAME =
  "size-5 border-primary/35 bg-card shadow-none data-[state=checked]:border-primary data-[state=checked]:bg-primary/15"

const TECHNICAL_ERROR_PATTERN =
  /relation .* does not exist|json parse|unrecognized token|syntax error|<!doctype html>|token <|referenceerror|typeerror|postgres|sqlstate|stack/i

function cleanErrorMessage(message: string | undefined, fallback: string) {
  if (!message) {
    return fallback
  }
  const normalized = message.trim().replace(/\s+/g, " ")
  if (!normalized) {
    return fallback
  }
  if (TECHNICAL_ERROR_PATTERN.test(normalized) || normalized.length > 180) {
    return fallback
  }
  return normalized
}

function mapApiError(error: unknown, stage: "load" | "submit" = "submit") {
  const fallback =
    stage === "load"
      ? "We are having trouble loading the questions right now. Please try again in a moment."
      : "We could not save this just yet. Your answers are still here, so please try again."

  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (error.status >= 500) {
      return fallback
    }
    if (error.status === 429) {
      return "Things are a little busy right now. Please wait a moment and try again."
    }
    if (stage === "load" && error.status === 404) {
      return "The questionnaire is not available right now. Please check back shortly."
    }

    const candidate =
      body && typeof body.message === "string"
        ? body.message
        : body && typeof body.error === "string"
          ? body.error
          : undefined

    return cleanErrorMessage(candidate, fallback)
  }

  if (error instanceof Error) {
    return cleanErrorMessage(error.message, fallback)
  }

  return fallback
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

function questionHelperText(question: FamilyQuestionSpec) {
  switch (question.responseType) {
    case "open_text":
      return "Share what you have observed in your own words."
    case "date_or_age":
      return "You can enter a date of birth or age in years."
    case "ack":
      return "Please confirm to continue."
    default:
      return "Choose the option that best fits right now."
  }
}

function answerSummaryText(answer: FamilyQuestionAnswer | undefined) {
  if (!answer) {
    return null
  }

  switch (answer.kind) {
    case "yes_no":
    case "confirm": {
      const labels: Record<FamilyQuestionAnswer["value"], string> = {
        yes: "Yes",
        no: "No",
        unclear: "Unclear",
        declined: "Prefer not to answer",
      }
      return labels[answer.value]
    }
    case "mild_mod_severe":
      return answer.value[0].toUpperCase() + answer.value.slice(1)
    case "ack":
      return "Acknowledged"
    case "date_or_age":
      return answer.value.trim()
    case "open_text": {
      const trimmed = answer.value.trim()
      if (!trimmed) {
        return null
      }
      return trimmed.length > 90 ? `${trimmed.slice(0, 90).trimEnd()}...` : trimmed
    }
    default:
      return null
  }
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showSectionRecap, setShowSectionRecap] = useState(false)

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
        setLoadingError(mapApiError(error, "load"))
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

  const currentQuestion = nodeQuestions[currentQuestionIndex] ?? null
  const missingCurrentQuestion =
    currentQuestion?.required && !isAnswerComplete(currentQuestion, answers[currentQuestion.id])
  const hasQuestionsInNode = nodeQuestions.length > 0
  const isFinalSection = currentStep === steps.length - 1
  const isFinalQuestionInSection = !hasQuestionsInNode || currentQuestionIndex === nodeQuestions.length - 1
  const readyToSubmit = isFinalSection && isFinalQuestionInSection
  const nextSectionNode = !isFinalSection ? steps[currentStep + 1] : null
  const nextSectionLabel = nextSectionNode ? NODE_LABELS[nextSectionNode] ?? "next section" : null
  const continueLabel = readyToSubmit
    ? "Get Recommendations"
    : hasQuestionsInNode && !isFinalQuestionInSection
      ? "Next question"
      : "Continue"
  const sectionContinueLabel =
    showSectionRecap && nextSectionLabel ? `Continue to ${nextSectionLabel}` : continueLabel
  const progressSummaryLabel = showSectionRecap
    ? "Here is what we captured in this section"
    : hasQuestionsInNode
      ? `${NODE_LABELS[currentNode] ?? "Section"} · Question ${currentQuestionIndex + 1} of ${nodeQuestions.length}`
      : `${NODE_LABELS[currentNode] ?? "Section"} · Ready to continue`
  const sectionRecapItems = useMemo(() => {
    return nodeQuestions
      .map((question) => {
        const summary = answerSummaryText(answers[question.id])
        if (!summary) {
          return null
        }
        return {
          id: question.id,
          label: question.label,
          summary,
        }
      })
      .filter((item): item is { id: string; label: string; summary: string } => item !== null)
  }, [answers, nodeQuestions])
  const canProceed =
    !loading &&
    !submitting &&
    !loadingError &&
    (
      showSectionRecap
        ? true
        : !currentQuestion || !missingCurrentQuestion
    )

  useEffect(() => {
    setCurrentQuestionIndex(0)
    setShowSectionRecap(false)
  }, [currentNode])

  useEffect(() => {
    if (nodeQuestions.length === 0) {
      setCurrentQuestionIndex(0)
      return
    }
    setCurrentQuestionIndex((previous) => Math.min(previous, nodeQuestions.length - 1))
  }, [nodeQuestions.length])

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
            className={cn(
              "h-12 rounded-full px-6 text-sm font-semibold",
              acknowledged && "shadow-[0_16px_24px_-22px_rgba(14,107,107,0.9)]",
            )}
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
            rows={5}
            placeholder="Share what you have noticed"
            className="rounded-2xl border-border/70 bg-background/70 px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/80"
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
            className="h-12 rounded-2xl border-border/70 bg-background/70 px-4 text-base placeholder:text-muted-foreground/80"
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
                className={OPTION_PILL_CLASSNAME}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${question.id}-${option.value}`}
                  className={OPTION_RADIO_CLASSNAME}
                />
                <span className="font-semibold">{option.label}</span>
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
                className={OPTION_PILL_CLASSNAME}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${question.id}-${option.value}`}
                  className={OPTION_RADIO_CLASSNAME}
                />
                <span className="font-semibold">{option.label}</span>
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

    if (showSectionRecap) {
      if (currentStep < steps.length - 1) {
        setShowSectionRecap(false)
        setCurrentStep(currentStep + 1)
      }
      return
    }

    if (currentQuestion && missingCurrentQuestion) {
      setSubmitError("Please answer this question before continuing.")
      return
    }

    if (currentQuestionIndex < nodeQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      return
    }

    if (currentStep < steps.length - 1) {
      if (hasQuestionsInNode) {
        setShowSectionRecap(true)
      } else {
        setCurrentStep(currentStep + 1)
      }
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
      setSubmitError("Please share at least one response so we can continue.")
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
      setSubmitError(mapApiError(error, "submit"))
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (showSectionRecap) {
      setShowSectionRecap(false)
      return
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      return
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      return
    }
    setCurrentScreen("start")
  }

  return (
    <div className="min-h-screen bg-background bg-texture">
      <div className="mx-auto max-w-3xl px-4 pb-36 pt-8 md:pb-40 md:pt-12">
        <header className="mb-10 space-y-3">
          <h1 className="font-serif text-3xl font-semibold text-foreground md:text-4xl">
            Family Intake Questionnaire
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            We will guide you one step at a time so we can understand your child&apos;s needs and
            recommend the right next care options.
          </p>
        </header>

        <Card className="mb-10 border-border/45 bg-card/72 shadow-[0_16px_34px_-30px_rgba(28,43,51,0.8)]">
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
              className="h-12 max-w-sm rounded-2xl border-border/70 bg-background/75 px-4 text-base"
            />
          </CardContent>
        </Card>

        <ProgressIndicator
          steps={steps.map((node) => NODE_LABELS[node] ?? "Section")}
          currentStep={Math.min(currentStep, steps.length - 1)}
          className="mb-10"
        />

        {hasImmediateSafetySignal && (
          <Card className="mb-8 border-warning/25 bg-warning/[0.08] shadow-[0_14px_32px_-30px_rgba(185,131,47,0.95)]">
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
          <Card className="mb-8 border-destructive/25 bg-destructive/[0.06] shadow-[0_14px_32px_-30px_rgba(182,64,64,0.95)]">
            <CardContent className="p-4 text-sm text-destructive">{loadingError}</CardContent>
          </Card>
        )}

        <Card className="border-border/45 bg-card/78 shadow-[0_20px_42px_-34px_rgba(28,43,51,0.9)]">
          <CardHeader className="gap-3.5">
            <CardTitle className="font-serif text-2xl leading-tight md:text-[2rem]">
              {NODE_LABELS[currentNode] ?? "Section"}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              {hasQuestionsInNode
                ? `Question ${currentQuestionIndex + 1} of ${nodeQuestions.length} in this section.`
                : "No questions are needed in this section based on earlier responses."}
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              {requiredMissing.length > 0
                ? `${requiredMissing.length} required question${requiredMissing.length === 1 ? "" : "s"} still need ${requiredMissing.length === 1 ? "a response" : "responses"} in this section.`
                : "All required questions in this section are complete."}
            </p>
          </CardHeader>

          <CardContent className="space-y-10 pb-10">
            {loading && <p className="text-sm text-muted-foreground">Loading question catalog...</p>}

            {!loading && !hasQuestionsInNode && (
              <p className="text-sm text-muted-foreground">
                No questions are applicable for this section based on current responses.
              </p>
            )}

            {!loading && currentQuestion && (
              <div
                key={currentQuestion.id}
                className="space-y-6 rounded-[1.35rem] bg-background/55 p-5 ring-1 ring-border/50 md:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {currentQuestion.label}
                  </p>
                  {currentQuestion.required && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Required
                    </span>
                  )}
                </div>

                <p className="font-serif text-[1.45rem] leading-tight text-foreground md:text-[1.9rem]">
                  {currentQuestion.prompt}
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {questionHelperText(currentQuestion)}
                </p>

                {renderAnswerInput(currentQuestion)}

                {missingCurrentQuestion && (
                  <p className="text-sm text-destructive">
                    This question is required before you continue.
                  </p>
                )}
              </div>
            )}

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/45 bg-background/86 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 md:pt-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/55 bg-card/92 px-3 py-3 shadow-[0_-12px_34px_-28px_rgba(28,43,51,0.95)] md:px-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="h-11 rounded-full border-border/65 px-5 text-sm font-medium"
            >
              <ArrowLeft size={18} />
              Back
            </Button>

            <p className="hidden min-w-0 flex-1 truncate px-2 text-center text-xs text-muted-foreground md:block">
              {progressSummaryLabel}
            </p>

            <Button
              onClick={handleNext}
              disabled={!canProceed || loading}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold hover:bg-primary/90"
            >
              {submitting ? "Submitting..." : continueLabel}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
