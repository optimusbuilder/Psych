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
        "relative flex min-h-[66px] w-full items-center gap-3 p-4 text-left transition-all duration-200 shadow-cura-sm pill-option",
        selected
          ? "pill-option-selected ring-1 ring-primary/25"
          : "hover:border-primary/35 hover:bg-white/90"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-primary"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-[15px] font-semibold text-slate-900">{label}</span>
    </motion.button>
  );
}
