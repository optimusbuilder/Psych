"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react"
import type { UrgencyLevel } from "@/lib/app-context"

interface UrgencyBadgeProps {
  level: UrgencyLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const urgencyConfig = {
  routine: {
    label: 'Routine',
    description: 'Schedule within 2-4 weeks',
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20',
  },
  priority: {
    label: 'Priority',
    description: 'Schedule within 1-2 weeks',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  urgent: {
    label: 'Urgent',
    description: 'Schedule within 48-72 hours',
    icon: AlertTriangle,
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  immediate: {
    label: 'Immediate',
    description: 'Seek care today',
    icon: AlertCircle,
    className: 'bg-destructive text-destructive-foreground border-destructive animate-pulse',
  },
}

export function UrgencyBadge({ level, size = 'md', className }: UrgencyBadgeProps) {
  const config = urgencyConfig[level]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  }

  return (
    <div
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  )
}

export function UrgencyBadgeWithDescription({ level, className }: UrgencyBadgeProps) {
  const config = urgencyConfig[level]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border",
        config.className,
        className
      )}
    >
      <Icon size={24} className="shrink-0" />
      <div>
        <p className="font-semibold">{config.label}</p>
        <p className="text-sm opacity-80">{config.description}</p>
      </div>
    </div>
  )
}
