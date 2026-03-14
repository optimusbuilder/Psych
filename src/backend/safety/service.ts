import type { SafetyInput } from "../intake/contracts";

export interface SafetyEvaluation {
  escalationLevel: "none" | "urgent" | "immediate";
  requiresImmediateReview: boolean;
  autoRoutingSuspended: boolean;
  reasonCodes: string[];
}

export function evaluateSafety(input: SafetyInput): SafetyEvaluation {
  const reasonCodes: string[] = [];
  const detailFlags = input.detailFlags ?? {};

  const immediateTriggers: string[] = [];
  if (detailFlags.immediateDangerNow) {
    immediateTriggers.push("SAFETY_IMMEDIATE_DANGER_NOW");
  }
  if (detailFlags.suicidalPlanOrIntent) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_SUICIDAL_PLAN_OR_INTENT");
  }
  if (detailFlags.suicideAttemptPast3Months) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_RECENT_ATTEMPT");
  }
  if (detailFlags.violentPlan || (detailFlags.violentTarget && detailFlags.violentMeansAccess)) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_VIOLENT_PLAN_OR_MEANS");
  }
  if (detailFlags.fireSetting || detailFlags.weaponUseOrAccessForHarm) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_FIRESETTING_OR_WEAPON");
  }
  if (detailFlags.severeIntoxicationWithdrawalOverdose) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_MEDICAL_SUBSTANCE_DANGER");
  }
  if (detailFlags.severePsychosisManiaDisorganization) {
    immediateTriggers.push("SAFETY_HIGH_ACUITY_PSYCHOSIS_MANIA_DISORGANIZATION");
  }

  if (input.suicidalRiskFlag) {
    reasonCodes.push("SUICIDAL_RISK");
  }
  if (input.violenceRiskFlag) {
    reasonCodes.push("VIOLENCE_RISK");
  }
  if (input.psychosisManiaFlag) {
    reasonCodes.push("PSYCHOSIS_OR_MANIA_RISK");
  }
  if (detailFlags.abuseNeglectConcern) {
    reasonCodes.push("ABUSE_OR_NEGLECT_RISK");
  }

  const hasAnySafetyRisk =
    reasonCodes.length > 0 ||
    immediateTriggers.length > 0 ||
    Boolean(detailFlags.violentTarget) ||
    Boolean(detailFlags.violentMeansAccess);

  const escalationLevel: SafetyEvaluation["escalationLevel"] =
    immediateTriggers.length > 0 ? "immediate" : hasAnySafetyRisk ? "urgent" : "none";
  const requiresImmediateReview = escalationLevel !== "none";

  if (escalationLevel === "immediate") {
    reasonCodes.push("SAFETY_IMMEDIATE");
  } else if (escalationLevel === "urgent") {
    reasonCodes.push("SAFETY_URGENT");
  } else {
    reasonCodes.push("SAFETY_CLEAR");
  }

  for (const trigger of immediateTriggers) {
    reasonCodes.push(trigger);
  }

  return {
    escalationLevel,
    requiresImmediateReview,
    autoRoutingSuspended: requiresImmediateReview,
    reasonCodes: Array.from(new Set(reasonCodes)),
  };
}
