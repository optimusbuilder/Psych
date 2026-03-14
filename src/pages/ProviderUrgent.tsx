import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { mockCases } from "@/data/mockData";
import { RiskBadge } from "@/components/RiskBadge";
import { AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ProviderUrgent() {
  const urgentCases = mockCases.filter((c) => c.riskLevel === "high");

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
      <motion.div variants={itemVariants} className="flex items-center gap-3 mb-1">
        <AlertTriangle className="w-6 h-6 text-urgent" />
        <h1 className="text-2xl font-semibold text-foreground">Urgent Alerts</h1>
      </motion.div>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-6">
        Cases with active safety flags requiring immediate review.
      </motion.p>

      {urgentCases.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16">
          <p className="text-muted-foreground">No urgent cases at this time.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {urgentCases.map((c) => (
            <motion.div
              key={c.id}
              variants={itemVariants}
              className="bg-card rounded-2xl border-2 border-urgent/20 p-6 shadow-cura-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-risk-high-bg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-urgent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.patientName}</h3>
                    <p className="text-sm text-muted-foreground">{c.alertType} · Age {c.age}</p>
                  </div>
                </div>
                <RiskBadge level={c.riskLevel} />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock size={12} />
                <span>Flagged {c.flaggedAt}</span>
              </div>

              <p className="text-sm text-foreground/80 mb-4">{c.summary}</p>

              <div className="flex gap-2">
                <Button asChild size="sm" className="rounded-xl">
                  <Link to={`/provider/cases/${c.id}`}>Review Case</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
