import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SelectableCard } from "@/components/SelectableCard";
import { AlertBanner } from "@/components/AlertBanner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import type { SafetyDetailFlags } from "@/lib/intakeQuestionLogic";

interface IntakeSafetyScreenProps {
  flags: SafetyDetailFlags;
  onChange: (flags: SafetyDetailFlags) => void;
  onNext: () => void;
  onBack: () => void;
  blocked: boolean;
}

const questions = [
  {
    key: "suicidalThoughts" as const,
    label: "In the past month, have there been suicidal thoughts or wishing to be dead?",
  },
  {
    key: "suicidalPlanOrIntent" as const,
    label: "Has there been suicidal plan, preparation, or intent to act?",
  },
  {
    key: "recentSelfHarmOrAttempt" as const,
    label: "Any recent self-harm or suicide attempt (past 3 months)?",
  },
  {
    key: "homicidalThoughtsOrThreat" as const,
    label: "Any serious threats or thoughts of harming others?",
  },
  {
    key: "violentPlanOrTarget" as const,
    label: "Any identified target, violent plan, or weapon access concern?",
  },
  {
    key: "psychosisOrManiaSigns" as const,
    label: "Any psychosis/mania-like signs (hallucinations, severe disorganization, grandiosity)?",
  },
  {
    key: "severeAggressionFireSettingWeapon" as const,
    label: "Any severe aggression, fire-setting, or weapon use behavior?",
  },
  {
    key: "severeIntoxicationOrWithdrawal" as const,
    label: "Any severe intoxication or withdrawal concern requiring medical triage?",
  },
  {
    key: "abuseOrNeglectConcern" as const,
    label: "Any abuse, neglect, or safeguarding concern requiring mandatory review?",
  },
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
          className="pointer-events-none absolute inset-0 -m-4 rounded-3xl bg-risk-high-bg/70"
        />
      )}

      <div className="relative">
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-semibold text-slate-900">Safety Screening</h2>
        </motion.div>
        <motion.p variants={itemVariants} className="mb-8 text-slate-600">
          We need a thorough safety check first. A "Yes" to any item triggers immediate clinical review.
        </motion.p>

        <div className="mx-auto max-w-2xl space-y-4">
          {questions.map((q) => (
            <motion.div key={q.key} variants={itemVariants}>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-800">{q.label}</p>
                <div className="flex gap-3">
                  <SelectableCard
                    selected={flags[q.key] === true}
                    onSelect={() => onChange({ ...flags, [q.key]: true })}
                    danger={flags[q.key] === true}
                    className="!min-h-0 flex-1 text-center !p-3"
                  >
                    <span className="text-sm font-semibold">Yes</span>
                  </SelectableCard>
                  <SelectableCard
                    selected={flags[q.key] === false}
                    onSelect={() => onChange({ ...flags, [q.key]: false })}
                    className="!min-h-0 flex-1 text-center !p-3"
                  >
                    <span className="text-sm font-semibold">No</span>
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
              description="A safety risk was identified. Automated routing is paused and this case should receive immediate clinician review."
              showPhone
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="flex justify-between mt-8">
          <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full text-slate-700 hover:bg-white/50">
            <ArrowLeft size={16} /> Back
          </Button>
          <Button
            onClick={onNext}
            className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
          >
            {blocked ? "Continue Anyway" : "Continue"} <ArrowRight size={16} />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
