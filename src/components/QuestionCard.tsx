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
        "relative w-full text-left rounded-2xl border-2 p-6 min-h-[80px] transition-colors shadow-cura-sm",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      <div className="flex items-center gap-4">
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <span className="text-base font-medium text-foreground">{label}</span>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
