import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { itemVariants } from "@/lib/motionVariants";

interface SymptomCardProps {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onToggle: () => void;
}

export function SymptomCard({ label, icon, selected, onToggle }: SymptomCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 min-h-[100px] transition-colors shadow-cura-sm",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </motion.button>
  );
}
