import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IntakeStepperProps {
  steps: string[];
  currentStep: number;
}

export function IntakeStepper({ steps, currentStep }: IntakeStepperProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full rounded-2xl border border-white/35 bg-white/55 p-4 shadow-cura-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {steps[currentStep]}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}
