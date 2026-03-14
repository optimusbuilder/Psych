import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { SeveritySlider } from "@/components/SeveritySlider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface FunctionalImpact {
  home: number;
  school: number;
  social: number;
  safety: number;
}

interface IntakeFunctionalImpactProps {
  impact: FunctionalImpact;
  onChange: (impact: FunctionalImpact) => void;
  onNext: () => void;
  onBack: () => void;
}

const domains = [
  { key: "home" as const, label: "Home Life" },
  { key: "school" as const, label: "School / Work" },
  { key: "social" as const, label: "Friends / Social" },
  { key: "safety" as const, label: "Safety Concerns" },
];

export function IntakeFunctionalImpact({ impact, onChange, onNext, onBack }: IntakeFunctionalImpactProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.h2 variants={itemVariants} className="text-2xl font-semibold text-foreground mb-2">
        How much is this affecting daily life?
      </motion.h2>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        Move the sliders to show the level of impact in each area.
      </motion.p>

      <div className="space-y-8">
        {domains.map((d) => (
          <motion.div key={d.key} variants={itemVariants}>
            <SeveritySlider
              label={d.label}
              value={impact[d.key]}
              onChange={(v) => onChange({ ...impact, [d.key]: v })}
            />
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button onClick={onNext} className="gap-2 rounded-xl">
          Continue to Summary <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
