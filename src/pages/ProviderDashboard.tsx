import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { dashboardStats, mockCases } from "@/data/mockData";
import { RiskBadge } from "@/components/RiskBadge";
import { AlertTriangle, FileText, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ClinicalPulse } from "@/components/provider/ClinicalPulse";

const statCards = [
  { label: "Urgent Cases", value: dashboardStats.urgentCases, icon: AlertTriangle, accent: "text-urgent" },
  { label: "New Referrals", value: dashboardStats.newReferrals, icon: FileText, accent: "text-primary" },
  { label: "Awaiting Review", value: dashboardStats.awaitingReview, icon: Clock, accent: "text-risk-moderate" },
  { label: "Completed Today", value: dashboardStats.completedToday, icon: CheckCircle2, accent: "text-secondary" },
];

export default function ProviderDashboard() {
  const urgentCases = mockCases.filter((c) => c.riskLevel === "high");
  const recentCases = mockCases.slice(0, 4);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
      <motion.h1 variants={itemVariants} className="text-2xl font-semibold text-foreground mb-1">
        Dashboard
      </motion.h1>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-6">
        Welcome back, Dr. Chen. Here's your clinical overview.
      </motion.p>

      {/* Stat cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            variants={itemVariants}
            className="bg-card rounded-2xl border border-border p-5 shadow-cura-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.accent}`} />
            </div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent cases */}
        <motion.div variants={itemVariants} className="md:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Recent Cases</h2>
            <Link to="/provider/cases" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentCases.map((c) => (
              <Link
                key={c.id}
                to={`/provider/cases/${c.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {c.patientName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.patientName}</p>
                    <p className="text-xs text-muted-foreground">{c.primaryConcern} · Age {c.age}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={c.riskLevel} />
                  <span className="text-xs text-muted-foreground tabular-nums">{c.severityScore}%</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Clinical Pulse */}
        <motion.div variants={itemVariants}>
          <ClinicalPulse />
        </motion.div>
      </div>
    </motion.div>
  );
}
