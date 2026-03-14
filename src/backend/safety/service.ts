import type { SafetyInput } from "../intake/contracts";

export interface SafetyEvaluation {
  escalationLevel: "none" | "urgent" | "immediate";
  requiresImmediateReview: boolean;
  autoRoutingSuspended: boolean;
  reasonCodes: string[];
}

export function evaluateSafety(input: SafetyInput): SafetyEvaluation {
  const reasonCodes: string[] = [];
  if (input.suicidalRiskFlag) {
    reasonCodes.push("SUICIDAL_RISK");
  }
  if (input.violenceRiskFlag) {
    reasonCodes.push("VIOLENCE_RISK");
  }
  if (input.psychosisManiaFlag) {
    reasonCodes.push("PSYCHOSIS_OR_MANIA_RISK");
  }

  const requiresImmediateReview = reasonCodes.length > 0;
  return {
    escalationLevel: requiresImmediateReview ? "urgent" : "none",
    requiresImmediateReview,
    autoRoutingSuspended: requiresImmediateReview,
    reasonCodes,
  };
}
