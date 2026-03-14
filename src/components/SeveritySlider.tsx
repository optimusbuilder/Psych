import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface SeveritySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const severityLabels = ["None", "Mild", "Moderate", "Severe", "Extreme"];

function getSeverityLabel(value: number) {
  if (value <= 2) return severityLabels[0];
  if (value <= 4) return severityLabels[1];
  if (value <= 6) return severityLabels[2];
  if (value <= 8) return severityLabels[3];
  return severityLabels[4];
}

function getTrackColor(value: number) {
  if (value <= 2) return "bg-secondary";
  if (value <= 4) return "bg-secondary";
  if (value <= 6) return "bg-risk-moderate";
  if (value <= 8) return "bg-urgent/70";
  return "bg-urgent";
}

export function SeveritySlider({ label, value, onChange }: SeveritySliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
            value <= 4
              ? "bg-secondary/10 text-secondary"
              : value <= 6
              ? "bg-risk-moderate-bg text-risk-moderate"
              : "bg-risk-high-bg text-risk-high"
          )}
        >
          {value}/10 · {getSeverityLabel(value)}
        </span>
      </div>
      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={10}
          step={1}
          className={cn("[&_[role=slider]]:border-2 [&_[role=slider]]:border-card", 
            "[&_[data-orientation=horizontal]>.bg-primary]:transition-colors",
          )}
        />
      </div>
    </div>
  );
}
