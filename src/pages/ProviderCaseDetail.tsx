import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, RotateCcw, ClipboardList, Calendar, ArrowUpRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, fetchProviderCaseDetail, submitCaseOverride } from "@/lib/api";
import { urgencyToRisk } from "@/lib/providerMappers";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function ageFromDob(dob: string) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) {
    return "-";
  }
  const now = new Date();
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) {
    years -= 1;
  }
  return years.toString();
}

export default function ProviderCaseDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [overrideDisposition, setOverrideDisposition] = useState("");
  const [overrideRationale, setOverrideRationale] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["provider", "caseDetail", id],
    queryFn: () => fetchProviderCaseDetail(id ?? ""),
    enabled: Boolean(id),
  });

  const overrideMutation = useMutation({
    mutationFn: (payload: { finalDisposition: string; rationale: string }) =>
      submitCaseOverride(id ?? "", payload),
    onSuccess: async () => {
      setOverrideDisposition("");
      setOverrideRationale("");
      setOverrideError(null);
      await queryClient.invalidateQueries({ queryKey: ["provider", "caseDetail", id] });
      await queryClient.invalidateQueries({ queryKey: ["provider", "reviewQueue"] });
      await queryClient.invalidateQueries({ queryKey: ["provider", "urgentCases"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        setOverrideError("Rationale and final disposition are required.");
        return;
      }
      setOverrideError("Unable to apply override right now.");
    },
  });

  const caseData = detailQuery.data;
  const impactDomains = useMemo(
    () =>
      caseData?.functionalImpact
        ? [
            { label: "Home", value: caseData.functionalImpact.homeScore },
            { label: "School", value: caseData.functionalImpact.schoolScore },
            { label: "Social", value: caseData.functionalImpact.peerScore },
            { label: "Safety", value: caseData.functionalImpact.safetyLegalScore },
          ]
        : [],
    [caseData],
  );

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading case details...</p>
      </div>
    );
  }

  if (!caseData || detailQuery.isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Case not found.</p>
      </div>
    );
  }

  const riskLevel = urgencyToRisk(caseData.latestDecision?.urgencyLevel);
  const patientName = `${caseData.patient.firstName} ${caseData.patient.lastName}`;
  const severityScore = Math.max(...impactDomains.map((item) => item.value), 0) * 10;
  const latestReview = caseData.clinicianReviews[0] ?? null;
  const safetyFlags = caseData.safetyAssessment
    ? [
        { label: "Suicidal risk", flag: caseData.safetyAssessment.suicidalRiskFlag },
        { label: "Violence risk", flag: caseData.safetyAssessment.violenceRiskFlag },
        { label: "Psychosis/mania flag", flag: caseData.safetyAssessment.psychosisManiaFlag },
      ]
    : [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
      <motion.div variants={itemVariants} className="mb-6">
        <Link to="/provider/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back to Cases
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{patientName}</h1>
            <p className="text-muted-foreground text-sm">{caseData.session.id} · {caseData.session.status}</p>
          </div>
          <RiskBadge level={riskLevel} className="text-sm px-3 py-1" />
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Patient Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Age</span>
              <span className="font-medium text-foreground">{ageFromDob(caseData.patient.dob)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-medium text-foreground">{caseData.patient.sexAtBirth ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Respondent</span>
              <span className="font-medium text-foreground">{caseData.respondent?.type ?? "-"}</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <span className="text-muted-foreground block mb-2">Presenting Concern</span>
              <span className="font-medium text-foreground">
                {caseData.symptomAssessment?.primaryFamily ?? "Not provided"}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Assessment Data</h2>

          <div className="mb-5">
            <h3 className="text-sm font-medium text-foreground mb-2">Safety Screening</h3>
            <div className="space-y-2">
              {safetyFlags.map((item) => (
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

          <div className="mb-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Functional Impairment</h3>
            <div className="space-y-2.5">
              {impactDomains.map((domain) => (
                <div key={domain.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{domain.label}</span>
                    <span className="tabular-nums font-medium text-foreground">{domain.value}/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        domain.value <= 3 ? "bg-secondary" : domain.value <= 6 ? "bg-risk-moderate" : "bg-urgent"
                      }`}
                      style={{ width: `${domain.value * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">Severity Score</h3>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{severityScore}<span className="text-base text-muted-foreground">%</span></p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Clinical Summary</h2>
            <p className="text-sm text-foreground leading-relaxed mb-4">
              {caseData.latestDecision?.recommendation ?? "Decision pending clinician review."}
            </p>
            <div className="border-l-4 border-primary bg-primary/5 p-3 rounded-r-xl text-sm">
              <p className="font-medium text-foreground">
                Engine: {caseData.latestDecision?.engineVersion ?? "n/a"} · Urgency: {caseData.latestDecision?.urgencyLevel ?? "routine"}
              </p>
            </div>
            {latestReview && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">Latest Clinician Review</p>
                <p className="text-muted-foreground mt-1">{latestReview.finalDisposition}</p>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>
            <div className="space-y-2 mb-4">
              <Button className="w-full justify-start gap-2 rounded-xl" size="sm" disabled>
                <CheckCircle2 size={16} /> Approve Recommendation
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" size="sm" disabled>
                <ClipboardList size={16} /> Assign Screening
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" size="sm" disabled>
                <Calendar size={16} /> Schedule Intake
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-urgent hover:text-urgent" size="sm" disabled>
                <ArrowUpRight size={16} /> Escalate Case
              </Button>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <RotateCcw size={14} /> Clinician Override
              </p>
              <Input
                placeholder="Final disposition"
                value={overrideDisposition}
                onChange={(event) => setOverrideDisposition(event.target.value)}
              />
              <Textarea
                placeholder="Rationale"
                value={overrideRationale}
                onChange={(event) => setOverrideRationale(event.target.value)}
                className="min-h-[90px]"
              />
              {overrideError && <p className="text-xs text-urgent">{overrideError}</p>}
              <Button
                className="w-full rounded-xl"
                size="sm"
                onClick={() => {
                  setOverrideError(null);
                  overrideMutation.mutate({
                    finalDisposition: overrideDisposition,
                    rationale: overrideRationale,
                  });
                }}
                disabled={overrideMutation.isPending || !overrideDisposition || !overrideRationale}
              >
                {overrideMutation.isPending ? "Saving..." : "Apply Override & Finalize"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
