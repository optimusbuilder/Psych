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

export function SeveritySlider({ label, value, onChange }: SeveritySliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            value <= 4
              ? "bg-emerald-100 text-emerald-700"
              : value <= 6
              ? "bg-amber-100 text-amber-700"
              : "bg-rose-100 text-rose-700"
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
          className={cn(
            "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md",
            "[&_[data-orientation=horizontal]>.bg-primary]:transition-colors [&_[data-orientation=horizontal]>.bg-primary]:bg-gradient-to-r [&_[data-orientation=horizontal]>.bg-primary]:from-cyan-400 [&_[data-orientation=horizontal]>.bg-primary]:to-blue-600",
          )}
        />
      </div>
    </div>
  );
}
