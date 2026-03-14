import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { itemVariants } from "@/lib/motionVariants";

interface QuestionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export function QuestionCard({ label, description, icon, selected, onSelect }: QuestionCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative w-full text-left min-h-[78px] p-5 transition-all duration-200 shadow-cura-sm pill-option",
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
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <span className="text-[15px] font-semibold text-slate-900">{label}</span>
          {description && (
            <p className="mt-0.5 text-sm text-slate-600">{description}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
