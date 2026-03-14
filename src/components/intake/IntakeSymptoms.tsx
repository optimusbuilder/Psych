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
  { id: "anxiety", label: "Anxiety / Panic", icon: <Brain size={28} /> },
  { id: "depression", label: "Depression / Mood", icon: <CloudRain size={28} /> },
  { id: "adhd", label: "ADHD / Attention", icon: <Zap size={28} /> },
  { id: "behavioral", label: "Behavioral Issues", icon: <AlertOctagon size={28} /> },
  { id: "social", label: "Social / Developmental", icon: <Users size={28} /> },
  { id: "substance", label: "Substance Use", icon: <Pill size={28} /> },
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
      <motion.h2 variants={itemVariants} className="text-2xl font-semibold text-foreground mb-2">
        What symptoms are you experiencing?
      </motion.h2>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        Select all that apply. You can choose more than one.
      </motion.p>

      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button onClick={onNext} disabled={selected.length === 0} className="gap-2 rounded-xl">
          Continue <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
