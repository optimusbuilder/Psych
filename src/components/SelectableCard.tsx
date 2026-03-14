import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SelectableCardProps {
  children: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  danger?: boolean;
}

export function SelectableCard({ children, selected, onSelect, className, danger }: SelectableCardProps) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-2xl border-2 p-5 transition-colors shadow-cura-sm",
        selected && !danger && "border-primary bg-primary/5",
        selected && danger && "border-urgent bg-risk-high-bg",
        !selected && "border-border bg-card hover:border-primary/30",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
