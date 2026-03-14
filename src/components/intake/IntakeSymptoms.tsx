import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SymptomCard } from "@/components/SymptomCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CloudRain,
  Zap,
  AlertOctagon,
  Users,
  Pill,
  ShieldAlert,
  Flame,
  Drumstick,
  Sparkles,
} from "lucide-react";
import {
  frequencyOptions,
  symptomDetailQuestions,
  symptomDetailsComplete,
  type FrequencyValue,
  type SymptomDetailResponses,
} from "@/lib/intakeQuestionLogic";
import { cn } from "@/lib/utils";

interface IntakeSymptomsProps {
  selected: string[];
  detailResponses: SymptomDetailResponses;
  onChange: (symptoms: string[]) => void;
  onDetailChange: (familyId: string, questionId: string, value: FrequencyValue) => void;
  onNext: () => void;
  onBack: () => void;
}

const symptoms = [
  { id: "anxiety", label: "Anxiety / Panic", icon: <Brain size={20} /> },
  { id: "depression", label: "Depression / Mood", icon: <CloudRain size={20} /> },
  { id: "adhd", label: "ADHD / Attention", icon: <Zap size={20} /> },
  { id: "behavioral", label: "Behavioral Dysregulation", icon: <AlertOctagon size={20} /> },
  { id: "conduct", label: "Conduct-Type Behaviors", icon: <ShieldAlert size={20} /> },
  { id: "social", label: "Social / Developmental", icon: <Users size={20} /> },
  { id: "trauma", label: "Trauma / Stress", icon: <Flame size={20} /> },
  { id: "eating", label: "Eating / Body Image", icon: <Drumstick size={20} /> },
  { id: "substance", label: "Substance Use", icon: <Pill size={20} /> },
  { id: "psychosis", label: "Psychosis / Mania", icon: <Sparkles size={20} /> },
];

export function IntakeSymptoms({
  selected,
  detailResponses,
  onChange,
  onDetailChange,
  onNext,
  onBack,
}: IntakeSymptomsProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };
  const detailComplete = symptomDetailsComplete(selected, detailResponses);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.h2 variants={itemVariants} className="mb-2 text-3xl font-semibold text-slate-900">
        What symptoms are you experiencing?
      </motion.h2>
      <motion.p variants={itemVariants} className="mb-8 text-slate-600">
        Select all symptom families that apply, then answer the follow-up frequency questions.
      </motion.p>

      <motion.div variants={containerVariants} className="mx-auto max-w-2xl space-y-3">
        {symptoms.map((s) => (
          <SymptomCard
            key={s.id}
            label={s.label}
            icon={s.icon}
            selected={selected.includes(s.id)}
            onToggle={() => toggle(s.id)}
          />
        ))}
      </motion.div>

      {selected.length > 0 && (
        <motion.div variants={containerVariants} className="mx-auto mt-8 max-w-2xl space-y-5">
          {selected.map((familyId) => {
            const typedFamily = familyId as keyof typeof symptomDetailQuestions;
            const familyQuestions = symptomDetailQuestions[typedFamily] ?? [];
            const familyLabel = symptoms.find((entry) => entry.id === familyId)?.label ?? familyId;

            return (
              <motion.div
                key={familyId}
                variants={itemVariants}
                className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-cura-sm"
              >
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  {familyLabel} follow-up
                </h3>
                <div className="space-y-4">
                  {familyQuestions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{question.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {frequencyOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => onDetailChange(familyId, question.id, option.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              detailResponses[typedFamily]?.[question.id] === option.value
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
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full text-slate-700 hover:bg-white/50">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={selected.length === 0}
          className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </motion.div>
      {selected.length > 0 && !detailComplete && (
        <motion.p variants={itemVariants} className="mt-3 text-xs text-slate-500">
          Follow-up items improve routing precision and are strongly recommended before continuing.
        </motion.p>
      )}
    </motion.div>
  );
}
