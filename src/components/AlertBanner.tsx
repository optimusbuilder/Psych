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
        className="rounded-2xl border border-rose-300/70 bg-gradient-to-br from-rose-50 to-white p-6 shadow-cura-sm"
      >
        <div className="flex items-center gap-3 font-semibold text-rose-700">
          <AlertTriangle size={20} />
          <h3>{title}</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-rose-900/80">{description}</p>
        {showPhone && (
          <a
            href="tel:988"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-rose-50 transition-colors hover:bg-rose-700"
          >
            <Phone size={16} />
            Call 988 Suicide & Crisis Lifeline
          </a>
        )}
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/95 to-white p-4 shadow-cura-sm">
      <p className="text-sm text-slate-700">{description}</p>
    </div>
  );
}
