import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IntakeStepperProps {
  steps: string[];
  currentStep: number;
}

export function IntakeStepper({ steps, currentStep }: IntakeStepperProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-sm font-medium text-foreground">
          {steps[currentStep]}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}
