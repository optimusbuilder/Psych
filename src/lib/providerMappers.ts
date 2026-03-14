import type { ReviewQueueCase } from "./api";

export type RiskLevel = "low" | "moderate" | "high";

export function urgencyToRisk(urgency: string | undefined): RiskLevel {
  if (urgency === "immediate" || urgency === "urgent") {
    return "high";
  }
  if (urgency === "priority") {
    return "moderate";
  }
  return "low";
}

export function toPatientInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function reviewCaseToUi(caseItem: ReviewQueueCase) {
  const severityBase =
    caseItem.latestDecision?.urgencyLevel === "immediate"
      ? 95
      : caseItem.latestDecision?.urgencyLevel === "urgent"
      ? 85
      : caseItem.latestDecision?.urgencyLevel === "priority"
      ? 65
      : 40;

  return {
    id: caseItem.sessionId,
    patientName: caseItem.patientName,
    riskLevel: urgencyToRisk(caseItem.latestDecision?.urgencyLevel),
    severityScore: severityBase,
    primaryConcern: caseItem.latestDecision?.recommendation ?? "Pending clinician review",
    status: caseItem.status,
    submittedAt: caseItem.submittedAt,
    createdAt: caseItem.createdAt,
  };
}
