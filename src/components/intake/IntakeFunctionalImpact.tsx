import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SeveritySlider } from "@/components/SeveritySlider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { frequencyOptions, type FrequencyValue, type FunctionalDetailResponses } from "@/lib/intakeQuestionLogic";
import { cn } from "@/lib/utils";

interface FunctionalImpact {
  home: number;
  school: number;
  social: number;
  safety: number;
}

interface IntakeFunctionalImpactProps {
  impact: FunctionalImpact;
  detailResponses: FunctionalDetailResponses;
  onChange: (impact: FunctionalImpact) => void;
  onDetailChange: (
    domain: keyof FunctionalDetailResponses,
    question: keyof FunctionalDetailResponses[keyof FunctionalDetailResponses],
    value: FrequencyValue,
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

const domains = [
  {
    key: "home" as const,
    label: "Home / Family",
    questions: [
      { id: "routineDisruption" as const, label: "Daily routines disrupted at home" },
      { id: "conflictOrConsequence" as const, label: "Family conflict or escalation episodes" },
      { id: "baselineFunctionDrop" as const, label: "Drop in self-care/household function" },
    ],
  },
  {
    key: "school" as const,
    label: "School / Academic / Work",
    questions: [
      { id: "routineDisruption" as const, label: "Attendance/participation impacted" },
      { id: "conflictOrConsequence" as const, label: "Performance decline or discipline events" },
      { id: "baselineFunctionDrop" as const, label: "Sustained drop from usual functioning" },
    ],
  },
  {
    key: "social" as const,
    label: "Peer / Social",
    questions: [
      { id: "routineDisruption" as const, label: "Social withdrawal or avoidance" },
      { id: "conflictOrConsequence" as const, label: "Peer conflict, bullying, or isolation" },
      { id: "baselineFunctionDrop" as const, label: "Reduced activity compared with baseline" },
    ],
  },
  {
    key: "safety" as const,
    label: "Safety / Legal",
    questions: [
      { id: "routineDisruption" as const, label: "Safety concerns affecting daily decisions" },
      { id: "conflictOrConsequence" as const, label: "Any incident risk (self-harm/aggression/legal)" },
      { id: "baselineFunctionDrop" as const, label: "Need for extra supervision to maintain safety" },
    ],
  },
];

export function IntakeFunctionalImpact({
  impact,
  detailResponses,
  onChange,
  onDetailChange,
  onNext,
  onBack,
}: IntakeFunctionalImpactProps) {
  const detailComplete = domains.every((domain) =>
    domain.questions.every((question) => detailResponses[domain.key][question.id] !== null),
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.h2 variants={itemVariants} className="mb-2 text-3xl font-semibold text-slate-900">
        How much is this affecting daily life?
      </motion.h2>
      <motion.p variants={itemVariants} className="mb-8 text-slate-600">
        Rate each domain in detail, then review or fine-tune the severity slider.
      </motion.p>

      <div className="mx-auto max-w-2xl space-y-5">
        {domains.map((d) => (
          <motion.div key={d.key} variants={itemVariants}>
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-cura-sm">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">{d.label}</h3>
                {d.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">{question.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {frequencyOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onDetailChange(d.key, question.id, option.value)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            detailResponses[d.key][question.id] === option.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-300 bg-white text-slate-700 hover:border-primary/40",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <SeveritySlider
                  label={`${d.label} severity`}
                  value={impact[d.key]}
                  onChange={(v) => onChange({ ...impact, [d.key]: v })}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full text-slate-700 hover:bg-white/50">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={onNext}
          className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
        >
          Continue to Summary <ArrowRight size={16} />
        </Button>
      </motion.div>
      {!detailComplete && (
        <motion.p variants={itemVariants} className="mt-3 text-xs text-slate-500">
          Detailed domain ratings improve severity accuracy and are strongly recommended.
        </motion.p>
      )}
    </motion.div>
  );
}
