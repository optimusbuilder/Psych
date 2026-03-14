"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface ProgressIndicatorProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  const clampedStep = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0))
  const mobileProgress = steps.length === 0 ? 0 : ((clampedStep + 1) / steps.length) * 100
  const connectorProgress =
    steps.length <= 1 ? 100 : (clampedStep / (steps.length - 1)) * 100

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: Simple progress bar */}
      <div className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 shadow-[0_12px_30px_-28px_rgba(28,43,51,0.8)] md:hidden">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">
            Section {clampedStep + 1} of {steps.length}
          </span>
          <span className="max-w-[60%] text-right text-xs leading-snug text-muted-foreground">
            {steps[clampedStep]}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border/70">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${mobileProgress}%` }}
          />
        </div>
      </div>

      {/* Desktop: Step indicators */}
      <div className="relative hidden rounded-3xl border border-border/45 bg-card/65 px-5 py-5 shadow-[0_16px_36px_-30px_rgba(28,43,51,0.85)] md:block">
        {steps.length > 1 && (
          <div
            className="absolute top-10 h-px bg-border/80"
            style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}
          >
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${connectorProgress}%` }}
            />
          </div>
        )}

        <div
          className="relative grid gap-2"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, index) => {
            const isCompleted = index < clampedStep
            const isCurrent = index === clampedStep
            const isUpcoming = index > clampedStep

            return (
              <div key={step} className="min-w-0 px-1">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary/85 bg-primary/12 text-primary shadow-[0_10px_24px_-20px_rgba(14,107,107,0.95)]",
                      isUpcoming && "border-border bg-background/75 text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
                  </div>
                  <span
                    className={cn(
                      "mt-2 block max-w-[8.75rem] text-xs leading-snug font-medium [overflow-wrap:anywhere]",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground",
                    )}
                  >
                    {step}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
