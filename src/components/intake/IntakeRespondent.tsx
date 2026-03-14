import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { User, Users, UserPlus, ArrowLeft, ArrowRight } from "lucide-react";

interface IntakeRespondentProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  { id: "self", label: "I am the patient", description: "I'm completing this for myself", icon: <User size={20} /> },
  { id: "parent", label: "I am a parent or caregiver", description: "I'm completing this for my child", icon: <Users size={20} /> },
  { id: "other", label: "I am completing this for someone else", description: "I'm an authorized representative", icon: <UserPlus size={20} /> },
];

export function IntakeRespondent({ value, onChange, onNext, onBack }: IntakeRespondentProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.h2 variants={itemVariants} className="mb-2 text-3xl font-semibold text-slate-900">
        Who are you completing this intake for?
      </motion.h2>
      <motion.p variants={itemVariants} className="mb-8 text-slate-600">
        This helps us personalize the questions.
      </motion.p>

      <div className="mx-auto max-w-2xl space-y-3">
        {options.map((opt) => (
          <motion.div key={opt.id} variants={itemVariants}>
            <QuestionCard
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              selected={value === opt.id}
              onSelect={() => onChange(opt.id)}
            />
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full text-slate-700 hover:bg-white/50">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!value}
          className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
