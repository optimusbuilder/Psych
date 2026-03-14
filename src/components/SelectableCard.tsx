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
        "w-full text-left p-5 transition-all duration-200 shadow-cura-sm pill-option",
        selected && !danger && "pill-option-selected ring-1 ring-primary/25",
        selected &&
          danger &&
          "border-rose-400 bg-gradient-to-b from-rose-50 to-rose-100 ring-1 ring-rose-300/50",
        !selected && "hover:border-primary/35 hover:bg-white/90",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
