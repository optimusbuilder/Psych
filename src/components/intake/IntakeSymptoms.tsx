import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SymptomCard } from "@/components/SymptomCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Brain, CloudRain, Zap, AlertOctagon, Users, Pill } from "lucide-react";

interface IntakeSymptomsProps {
  selected: string[];
  onChange: (symptoms: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const symptoms = [
  { id: "anxiety", label: "Anxiety / Panic", icon: <Brain size={20} /> },
  { id: "depression", label: "Depression / Mood", icon: <CloudRain size={20} /> },
  { id: "adhd", label: "ADHD / Attention", icon: <Zap size={20} /> },
  { id: "behavioral", label: "Behavioral Issues", icon: <AlertOctagon size={20} /> },
  { id: "social", label: "Social / Developmental", icon: <Users size={20} /> },
  { id: "substance", label: "Substance Use", icon: <Pill size={20} /> },
];

export function IntakeSymptoms({ selected, onChange, onNext, onBack }: IntakeSymptomsProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

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
        Select all that apply. You can choose more than one.
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
    </motion.div>
  );
}
