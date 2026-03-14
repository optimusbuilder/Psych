import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/data/mockData";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const config: Record<RiskLevel, { label: string; classes: string }> = {
  low: {
    label: "Stable",
    classes: "bg-risk-low-bg text-risk-low border-risk-low/20",
  },
  moderate: {
    label: "Moderate",
    classes: "bg-risk-moderate-bg text-risk-moderate border-risk-moderate/20",
  },
  high: {
    label: "High",
    classes: "bg-risk-high-bg text-risk-high border-risk-high/20",
  },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const { label, classes } = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        classes,
        className
      )}
    >
      {label}
    </span>
  );
}
