import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { RiskBadge } from "@/components/RiskBadge";
import { AlertTriangle, FileText, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ClinicalPulse } from "@/components/provider/ClinicalPulse";
import { useQuery } from "@tanstack/react-query";
import { fetchReviewQueue, fetchUrgentCases } from "@/lib/api";
import { reviewCaseToUi, toPatientInitials } from "@/lib/providerMappers";

export default function ProviderDashboard() {
  const reviewQueueQuery = useQuery({
    queryKey: ["provider", "reviewQueue", "all"],
    queryFn: () => fetchReviewQueue("all"),
  });
  const urgentQuery = useQuery({
    queryKey: ["provider", "urgentCases"],
    queryFn: fetchUrgentCases,
  });

  const cases = (reviewQueueQuery.data?.cases ?? []).map(reviewCaseToUi);
  const recentCases = cases.slice(0, 4);
  const awaitingReview = (reviewQueueQuery.data?.cases ?? []).filter(
    (caseItem) => caseItem.status === "awaiting_review",
  ).length;
  const newReferrals = (reviewQueueQuery.data?.cases ?? []).filter((caseItem) => {
    const created = new Date(caseItem.createdAt).getTime();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return created >= oneDayAgo;
  }).length;

  const statCards = [
    {
      label: "Urgent Cases",
      value: urgentQuery.data?.count ?? 0,
      icon: AlertTriangle,
      accent: "text-urgent",
    },
    { label: "New Referrals", value: newReferrals, icon: FileText, accent: "text-primary" },
    {
      label: "Awaiting Review",
      value: awaitingReview,
      icon: Clock,
      accent: "text-risk-moderate",
    },
    {
      label: "Completed Today",
      value: 0,
      icon: CheckCircle2,
      accent: "text-secondary",
    },
  ];

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
            {reviewQueueQuery.isLoading && (
              <div className="text-sm text-muted-foreground">Loading live queue...</div>
            )}
            {recentCases.map((c) => (
              <Link
                key={c.id}
                to={`/provider/cases/${c.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {toPatientInitials(c.patientName)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.patientName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.primaryConcern}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={c.riskLevel} />
                  <span className="text-xs text-muted-foreground tabular-nums">{c.severityScore}%</span>
                </div>
              </Link>
            ))}
            {!reviewQueueQuery.isLoading && recentCases.length === 0 && (
              <div className="text-sm text-muted-foreground">No queue cases yet.</div>
            )}
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
