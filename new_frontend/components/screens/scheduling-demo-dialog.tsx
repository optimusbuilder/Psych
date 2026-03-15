"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Circle, ShieldAlert } from "lucide-react"

import { useApp } from "@/lib/app-context"
import {
  buildEventLogLine,
  createDemoSchedulingSession,
  describeDemoStepOutcome,
  formatSlotLabel,
  getDemoStepLoadingText,
  getDemoStepTitle,
  getSlotOptionsForMatchStep,
  type DemoSchedulingSession,
  type DemoSchedulingStep,
} from "@/lib/demo-scheduling"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

const STEP_DELAY_MS = 1100

type RunState = "idle" | "running" | "awaiting_confirmation" | "complete"

interface SchedulingDemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExecutedStep {
  step: DemoSchedulingStep
  message: string
  eventLog: string
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

export function SchedulingDemoDialog({ open, onOpenChange }: SchedulingDemoDialogProps) {
  const { recommendation, intakeData } = useApp()

  const [session, setSession] = useState<DemoSchedulingSession | null>(null)
  const [runState, setRunState] = useState<RunState>("idle")
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null)
  const [executedSteps, setExecutedSteps] = useState<ExecutedStep[]>([])
  const [eventLog, setEventLog] = useState<string[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const runTokenRef = useRef(0)

  const resetFlow = useCallback(() => {
    if (!recommendation) {
      setSession(null)
      setRunState("idle")
      setActiveStepIndex(null)
      setExecutedSteps([])
      setEventLog([])
      setSelectedSlotId(null)
      return
    }

    runTokenRef.current += 1
    const nextSession = createDemoSchedulingSession({
      recommendation,
      childName: intakeData.childName || undefined,
    })
    setSession(nextSession)
    setRunState("idle")
    setActiveStepIndex(null)
    setExecutedSteps([])
    setEventLog([])
    setSelectedSlotId(null)
  }, [intakeData.childName, recommendation])

  useEffect(() => {
    if (open) {
      resetFlow()
      return
    }

    runTokenRef.current += 1
  }, [open, resetFlow])

  const lastExecutedStep = executedSteps.length > 0 ? executedSteps[executedSteps.length - 1]?.step : null

  const matchStepAwaitingAction =
    runState === "awaiting_confirmation" && lastExecutedStep?.step === "matchAvailability"
      ? lastExecutedStep
      : null

  const slotOptions = useMemo(() => {
    if (!session || !matchStepAwaitingAction) {
      return []
    }
    return getSlotOptionsForMatchStep(session, matchStepAwaitingAction)
  }, [matchStepAwaitingAction, session])

  useEffect(() => {
    if (slotOptions.length > 0 && !selectedSlotId) {
      setSelectedSlotId(slotOptions[0].slot.slotId)
    }
  }, [selectedSlotId, slotOptions])

  const runFromIndex = useCallback(
    async (startIndex: number, selectedSlotForConfirmation?: string | null) => {
      if (!session) {
        return
      }

      const runToken = ++runTokenRef.current
      setRunState("running")

      for (let index = startIndex; index < session.timeline.length; index += 1) {
        if (runTokenRef.current !== runToken) {
          return
        }

        const originalStep = session.timeline[index]
        let step: DemoSchedulingStep = originalStep

        if (
          originalStep.step === "confirmBooking" &&
          originalStep.result.bookingStatus === "CONFIRMED" &&
          selectedSlotForConfirmation
        ) {
          step = {
            ...originalStep,
            result: {
              ...originalStep.result,
              slotId: selectedSlotForConfirmation,
            },
          }
        }

        setActiveStepIndex(index)
        await wait(STEP_DELAY_MS)

        if (runTokenRef.current !== runToken) {
          return
        }

        const message = describeDemoStepOutcome({
          session,
          step,
          selectedSlotId: selectedSlotForConfirmation,
        })

        setExecutedSteps((previous) => [
          ...previous,
          {
            step,
            message,
            eventLog: buildEventLogLine(step),
          },
        ])
        setEventLog((previous) => [...previous, buildEventLogLine(step)])

        if (
          step.step === "matchAvailability" &&
          (step.result.status === "SLOTS_FOUND" || step.result.status === "NO_PRIMARY_SLOTS")
        ) {
          setRunState("awaiting_confirmation")
          setActiveStepIndex(null)
          return
        }
      }

      if (runTokenRef.current === runToken) {
        setActiveStepIndex(null)
        setRunState("complete")
      }
    },
    [session],
  )

  const handlePrimaryAction = useCallback(() => {
    if (!session) {
      return
    }

    if (runState === "idle") {
      void runFromIndex(0, selectedSlotId)
      return
    }

    if (runState === "awaiting_confirmation") {
      void runFromIndex(executedSteps.length, selectedSlotId)
      return
    }

    if (runState === "complete") {
      resetFlow()
    }
  }, [executedSteps.length, resetFlow, runFromIndex, runState, selectedSlotId, session])

  const progressValue = session
    ? Math.round((executedSteps.length / Math.max(session.timeline.length, 1)) * 100)
    : 0

  const primaryButtonLabel = (() => {
    if (runState === "idle") {
      return "Run mock workflow"
    }
    if (runState === "running") {
      return "Running..."
    }
    if (runState === "awaiting_confirmation") {
      if (matchStepAwaitingAction?.result.status === "NO_PRIMARY_SLOTS") {
        return "Join waitlist (Demo)"
      }
      return "Confirm selected slot (Demo)"
    }
    return "Reset demo"
  })()

  const primaryButtonDisabled =
    runState === "running" ||
    (runState === "awaiting_confirmation" &&
      matchStepAwaitingAction?.result.status === "SLOTS_FOUND" &&
      !selectedSlotId)

  const completedConfirmation = executedSteps.find((entry) => entry.step.step === "confirmBooking")
  const completedSafetyBypass = executedSteps.find((entry) => entry.step.step === "safetyBypass")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Demo-only integration</Badge>
            {session && <Badge variant="outline">Scenario: {session.scenarioKey.replaceAll("_", " ")}</Badge>}
          </div>
          <DialogTitle>Care Coordination Workflow</DialogTitle>
          <DialogDescription>
            Simulated EHR checks, referral creation, and booking orchestration for demo use only.
          </DialogDescription>
        </DialogHeader>

        {!session && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Complete the intake flow first to generate a recommendation before running the scheduling demo.
            </CardContent>
          </Card>
        )}

        {session && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Matched Specialist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-foreground">{session.specialistType}</p>
                <p className="text-muted-foreground">Referral ID: {session.referralId}</p>
                <Progress value={progressValue} />
                <p className="text-xs text-muted-foreground">
                  {executedSteps.length} of {session.timeline.length} workflow steps complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.timeline.map((step, index) => {
                  const executed = executedSteps[index]
                  const isActive = !executed && runState === "running" && activeStepIndex === index

                  return (
                    <div
                      key={`${step.step}-${index}`}
                      className="rounded-lg border border-border/70 bg-background/70 px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {executed ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : isActive ? (
                            <Spinner className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{getDemoStepTitle(step.step)}</p>
                          <p className="text-sm text-muted-foreground">
                            {executed?.message ?? (isActive ? getDemoStepLoadingText(step.step) : "Pending")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {matchStepAwaitingAction && slotOptions.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {matchStepAwaitingAction.result.status === "NO_PRIMARY_SLOTS"
                      ? "Primary provider is full"
                      : "Select an appointment slot"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {slotOptions.map((option) => {
                    const selected = selectedSlotId === option.slot.slotId
                    return (
                      <button
                        key={option.slot.slotId}
                        type="button"
                        onClick={() => setSelectedSlotId(option.slot.slotId)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border/70 bg-background hover:border-primary/40"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{option.provider.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSlotLabel(option.slot, session.timezone)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.slot.mode === "virtual" ? "Virtual visit" : "In-person visit"}
                          {option.isFallback ? " (fallback option)" : ""}
                        </p>
                      </button>
                    )
                  })}

                  {matchStepAwaitingAction.result.status === "NO_PRIMARY_SLOTS" && (
                    <p className="text-xs text-muted-foreground">
                      You can keep a fallback option or use waitlist flow for the primary specialist.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {runState === "complete" && (completedConfirmation || completedSafetyBypass) && (
              <Card className="border-success/35 bg-success/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {completedSafetyBypass ? (
                      <>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        Immediate safety escalation complete
                      </>
                    ) : (
                      "Appointment workflow complete"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {completedConfirmation && <p className="text-foreground">{completedConfirmation.message}</p>}
                  {completedSafetyBypass && <p className="text-foreground">{completedSafetyBypass.message}</p>}
                </CardContent>
              </Card>
            )}

            {eventLog.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Audit Trail (Demo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm text-foreground">
                    {eventLog.map((entry, index) => (
                      <li key={`${entry}-${index}`} className="flex gap-2">
                        <span className="w-5 shrink-0 text-muted-foreground">{index + 1}.</span>
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrimaryAction} disabled={!session || primaryButtonDisabled}>
            {primaryButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
