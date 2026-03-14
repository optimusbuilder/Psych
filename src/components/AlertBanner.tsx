import { AlertTriangle, Phone } from "lucide-react";
import { motion } from "framer-motion";

interface AlertBannerProps {
  variant?: "emergency" | "urgent" | "info";
  title: string;
  description: string;
  showPhone?: boolean;
}

export function AlertBanner({ variant = "emergency", title, description, showPhone }: AlertBannerProps) {
  if (variant === "emergency") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-l-4 border-urgent bg-risk-high-bg p-6 rounded-r-2xl"
      >
        <div className="flex items-center gap-3 text-urgent font-semibold">
          <AlertTriangle size={20} />
          <h3>{title}</h3>
        </div>
        <p className="text-foreground/70 mt-2 text-sm leading-relaxed">{description}</p>
        {showPhone && (
          <a
            href="tel:988"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-urgent px-4 py-2 text-sm font-medium text-urgent-foreground hover:bg-urgent/90 transition-colors"
          >
            <Phone size={16} />
            Call 988 Suicide & Crisis Lifeline
          </a>
        )}
      </motion.div>
    );
  }

  return (
    <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-xl">
      <p className="text-sm text-foreground/80">{description}</p>
    </div>
  );
}
