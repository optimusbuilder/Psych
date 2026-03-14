import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { mockCases } from "@/data/mockData";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertTriangle, RotateCcw, ClipboardList, Calendar, ArrowUpRight } from "lucide-react";

export default function ProviderCaseDetail() {
  const { id } = useParams();
  const caseData = mockCases.find((c) => c.id === id);

  if (!caseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Case not found.</p>
      </div>
    );
  }

  const impactDomains = [
    { label: "Home", value: caseData.functionalImpact.home },
    { label: "School", value: caseData.functionalImpact.school },
    { label: "Social", value: caseData.functionalImpact.social },
    { label: "Safety", value: caseData.functionalImpact.safety },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
      <motion.div variants={itemVariants} className="mb-6">
        <Link to="/provider/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back to Cases
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{caseData.patientName}</h1>
            <p className="text-muted-foreground text-sm">{caseData.id} · {caseData.respondent} report</p>
          </div>
          <RiskBadge level={caseData.riskLevel} className="text-sm px-3 py-1" />
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Patient summary */}
        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Patient Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Age</span>
              <span className="font-medium text-foreground">{caseData.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-medium text-foreground">{caseData.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Respondent</span>
              <span className="font-medium text-foreground">{caseData.respondent}</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <span className="text-muted-foreground block mb-2">Presenting Concerns</span>
              <span className="font-medium text-foreground">{caseData.primaryConcern}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-2">Symptom Family</span>
              <div className="flex flex-wrap gap-1.5">
                {caseData.symptoms.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center: Assessment data */}
        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Assessment Data</h2>

          {/* Safety screening */}
          <div className="mb-5">
            <h3 className="text-sm font-medium text-foreground mb-2">Safety Screening</h3>
            <div className="space-y-2">
              {[
                { label: "Self-harm risk", flag: caseData.safetyFlags.selfHarm },
                { label: "Suicidal thoughts", flag: caseData.safetyFlags.suicidalThoughts },
                { label: "Harm to others", flag: caseData.safetyFlags.harmToOthers },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  {item.flag ? (
                    <span className="px-2 py-0.5 rounded-full bg-risk-high-bg text-risk-high text-xs font-semibold">Yes</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-risk-low-bg text-risk-low text-xs font-semibold">No</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Functional impact */}
          <div className="mb-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Functional Impairment</h3>
            <div className="space-y-2.5">
              {impactDomains.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="tabular-nums font-medium text-foreground">{d.value}/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        d.value <= 3 ? "bg-secondary" : d.value <= 6 ? "bg-risk-moderate" : "bg-urgent"
                      }`}
                      style={{ width: `${d.value * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">Severity Score</h3>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{caseData.severityScore}<span className="text-base text-muted-foreground">%</span></p>
          </div>
        </motion.div>

        {/* Right: Summary + Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Clinical Summary</h2>
            <p className="text-sm text-foreground leading-relaxed mb-4">{caseData.summary}</p>
            <div className={`border-l-4 p-3 rounded-r-xl text-sm ${
              caseData.riskLevel === "high"
                ? "border-urgent bg-risk-high-bg"
                : caseData.riskLevel === "moderate"
                ? "border-risk-moderate bg-risk-moderate-bg"
                : "border-secondary bg-secondary/10"
            }`}>
              <p className="font-medium text-foreground">{caseData.recommendation}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>
            <div className="space-y-2">
              <Button className="w-full justify-start gap-2 rounded-xl" size="sm">
                <CheckCircle2 size={16} /> Approve Recommendation
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" size="sm">
                <RotateCcw size={16} /> Override Decision
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" size="sm">
                <ClipboardList size={16} /> Assign Screening
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" size="sm">
                <Calendar size={16} /> Schedule Intake
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-urgent hover:text-urgent" size="sm">
                <ArrowUpRight size={16} /> Escalate Case
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
