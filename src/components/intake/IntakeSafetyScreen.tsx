import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SelectableCard } from "@/components/SelectableCard";
import { AlertBanner } from "@/components/AlertBanner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";

interface SafetyFlags {
  selfHarm: boolean;
  suicidal: boolean;
  harmOthers: boolean;
}

interface IntakeSafetyScreenProps {
  flags: SafetyFlags;
  onChange: (flags: SafetyFlags) => void;
  onNext: () => void;
  onBack: () => void;
  blocked: boolean;
}

const questions = [
  { key: "selfHarm" as const, label: "Is the person currently at risk of harming themselves?" },
  { key: "suicidal" as const, label: "Have they recently had suicidal thoughts?" },
  { key: "harmOthers" as const, label: "Have they threatened harm to others?" },
];

export function IntakeSafetyScreen({ flags, onChange, onNext, onBack, blocked }: IntakeSafetyScreenProps) {
  const anyPositive = Object.values(flags).some(Boolean);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
      className={anyPositive ? "relative" : ""}
    >
      {anyPositive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 -m-4 rounded-3xl bg-risk-high-bg/50 pointer-events-none"
        />
      )}

      <div className="relative">
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-6 h-6 text-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">Safety Screening</h2>
        </motion.div>
        <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
          We need to ask a few important questions to make sure we provide the right level of care.
        </motion.p>

        <div className="space-y-4">
          {questions.map((q) => (
            <motion.div key={q.key} variants={itemVariants}>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{q.label}</p>
                <div className="flex gap-3">
                  <SelectableCard
                    selected={flags[q.key] === true}
                    onSelect={() => onChange({ ...flags, [q.key]: true })}
                    danger={flags[q.key] === true}
                    className="flex-1 text-center !p-3 !min-h-0"
                  >
                    <span className="text-sm font-medium">Yes</span>
                  </SelectableCard>
                  <SelectableCard
                    selected={flags[q.key] === false}
                    onSelect={() => onChange({ ...flags, [q.key]: false })}
                    className="flex-1 text-center !p-3 !min-h-0"
                  >
                    <span className="text-sm font-medium">No</span>
                  </SelectableCard>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {blocked && (
          <motion.div variants={itemVariants} className="mt-6">
            <AlertBanner
              variant="emergency"
              title="Immediate Attention Required"
              description="Based on your responses, we recommend contacting emergency services or proceeding to the nearest psychiatric emergency department."
              showPhone
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="flex justify-between mt-8">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
          <Button onClick={onNext} className="gap-2 rounded-xl">
            {blocked ? "Continue Anyway" : "Continue"} <ArrowRight size={16} />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
