import type {
  AgeBand,
  NormalizedSymptomFamily,
  SeverityTier,
  UrgencyLevel,
} from "../rules/engine";

export const INSTRUMENT_ENGINE_VERSION = "instrument-v1.0.0";

export type InstrumentName =
  | "PSC-17"
  | "SWYC"
  | "SDQ"
  | "SCARED"
  | "GAD-7"
  | "PHQ-A"
  | "PHQ-9"
  | "ASQ"
  | "Vanderbilt"
  | "M-CHAT-R/F"
  | "SWYC POSI"
  | "CRAFFT"
  | "SCOFF";

export type InstrumentAssignedTo = "patient" | "caregiver" | "teacher" | "clinician";

export interface InstrumentRecommendation {
  instrumentName: InstrumentName;
  assignedTo: InstrumentAssignedTo;
  rationale: string;
}

export interface InstrumentRoutingInput {
  ageBand: AgeBand;
  symptomFamily: NormalizedSymptomFamily;
  severityTier: SeverityTier;
}

export interface InstrumentScoreInterpretation {
  instrumentName: string;
  rawScore: number;
  cutoffTriggered: boolean;
  interpretation: string;
  severityBand: "none" | "mild" | "moderate" | "severe";
}

export interface InstrumentDecisionUpdate {
  recommendation: string;
  requiresClinicianReview: boolean;
  urgencyLevel: UrgencyLevel;
  reasonCode: string;
  engineVersion: string;
}

function broadScreenForAge(ageBand: AgeBand): InstrumentRecommendation[] {
  switch (ageBand) {
    case "early_childhood":
      return [
        {
          instrumentName: "SWYC",
          assignedTo: "caregiver",
          rationale: "Broad developmental-behavioral screen for early childhood.",
        },
      ];
    case "school_age":
      return [
        {
          instrumentName: "PSC-17",
          assignedTo: "caregiver",
          rationale: "Broad psychosocial screen for school-age children.",
        },
      ];
    case "adolescent":
      return [
        {
          instrumentName: "PSC-17",
          assignedTo: "caregiver",
          rationale: "Broad psychosocial screen with caregiver report.",
        },
      ];
    case "transitional_young_adult":
      return [
        {
          instrumentName: "SDQ",
          assignedTo: "patient",
          rationale: "Broad psychosocial symptom screen for older youth self-report.",
        },
      ];
    default:
      return [];
  }
}

export function recommendInstruments(input: InstrumentRoutingInput): InstrumentRecommendation[] {
  const recommendations: InstrumentRecommendation[] = [...broadScreenForAge(input.ageBand)];

  if (input.symptomFamily === "anxiety_worry_panic_ocd") {
    recommendations.push(
      input.ageBand === "adolescent" || input.ageBand === "transitional_young_adult"
        ? {
            instrumentName: "GAD-7",
            assignedTo: "patient",
            rationale: "Anxiety severity self-report for adolescents and older youth.",
          }
        : {
            instrumentName: "SCARED",
            assignedTo: "caregiver",
            rationale: "Anxiety symptom screen for younger children via caregiver report.",
          },
    );
  }

  if (input.symptomFamily === "mood_depression_irritability") {
    if (input.ageBand === "adolescent") {
      recommendations.push({
        instrumentName: "PHQ-A",
        assignedTo: "patient",
        rationale: "Adolescent depression symptom severity screen.",
      });
    } else {
      recommendations.push({
        instrumentName: "PHQ-9",
        assignedTo: "patient",
        rationale: "Depression symptom severity screen.",
      });
    }
    if (input.severityTier === "moderate" || input.severityTier === "severe") {
      recommendations.push({
        instrumentName: "ASQ",
        assignedTo: "patient",
        rationale: "Targeted suicide risk screening for moderate/severe mood concern.",
      });
    }
  }

  if (
    input.symptomFamily === "attention_hyperactivity_impulsivity" ||
    input.symptomFamily === "behavioral_dysregulation_defiance_aggression" ||
    input.symptomFamily === "conduct_type_behaviors"
  ) {
    recommendations.push(
      {
        instrumentName: "Vanderbilt",
        assignedTo: "caregiver",
        rationale: "ADHD/disruptive behavior structured rating scale from caregiver.",
      },
      {
        instrumentName: "Vanderbilt",
        assignedTo: "teacher",
        rationale: "Cross-setting school-based rating for ADHD/disruptive behavior.",
      },
    );
  }

  if (input.symptomFamily === "autism_developmental_social") {
    if (input.ageBand === "early_childhood") {
      recommendations.push({
        instrumentName: "M-CHAT-R/F",
        assignedTo: "caregiver",
        rationale: "Autism risk screener for early childhood.",
      });
    }
    recommendations.push({
      instrumentName: "SWYC POSI",
      assignedTo: "caregiver",
      rationale: "Developmental/autism social communication screening.",
    });
  }

  if (input.symptomFamily === "substance_use") {
    recommendations.push({
      instrumentName: "CRAFFT",
      assignedTo: "patient",
      rationale: "Substance use screening for adolescents/young adults.",
    });
  }

  if (input.symptomFamily === "eating_body_image") {
    recommendations.push({
      instrumentName: "SCOFF",
      assignedTo: "patient",
      rationale: "Eating disorder risk screening.",
    });
  }

  const dedupe = new Map<string, InstrumentRecommendation>();
  for (const recommendation of recommendations) {
    const key = `${recommendation.instrumentName}::${recommendation.assignedTo}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, recommendation);
    }
  }
  return Array.from(dedupe.values());
}

export function interpretInstrumentScore(
  instrumentName: InstrumentName | string,
  rawScore: number,
): InstrumentScoreInterpretation {
  switch (instrumentName) {
    case "PHQ-A":
    case "PHQ-9": {
      if (rawScore >= 20) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: true,
          interpretation: "Severe depressive symptom burden.",
          severityBand: "severe",
        };
      }
      if (rawScore >= 15) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: true,
          interpretation: "Moderately severe depressive symptom burden.",
          severityBand: "moderate",
        };
      }
      if (rawScore >= 10) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: true,
          interpretation: "Moderate depressive symptoms above clinical cutoff.",
          severityBand: "moderate",
        };
      }
      if (rawScore >= 5) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: false,
          interpretation: "Mild depressive symptoms below escalation cutoff.",
          severityBand: "mild",
        };
      }
      return {
        instrumentName,
        rawScore,
        cutoffTriggered: false,
        interpretation: "Minimal depressive symptoms.",
        severityBand: "none",
      };
    }
    case "GAD-7": {
      if (rawScore >= 15) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: true,
          interpretation: "Severe anxiety symptoms above clinical cutoff.",
          severityBand: "severe",
        };
      }
      if (rawScore >= 10) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: true,
          interpretation: "Moderate anxiety symptoms above clinical cutoff.",
          severityBand: "moderate",
        };
      }
      if (rawScore >= 5) {
        return {
          instrumentName,
          rawScore,
          cutoffTriggered: false,
          interpretation: "Mild anxiety symptoms below escalation cutoff.",
          severityBand: "mild",
        };
      }
      return {
        instrumentName,
        rawScore,
        cutoffTriggered: false,
        interpretation: "Minimal anxiety symptoms.",
        severityBand: "none",
      };
    }
    case "SCARED":
      return rawScore >= 25
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "Anxiety score above SCARED referral threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "Anxiety score below SCARED referral threshold.",
            severityBand: "mild",
          };
    case "Vanderbilt":
      return rawScore >= 6
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "ADHD/disruptive behavior symptoms above Vanderbilt threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "Vanderbilt symptoms below threshold.",
            severityBand: "mild",
          };
    case "M-CHAT-R/F":
      return rawScore >= 3
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "Autism risk items above M-CHAT-R/F referral threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "Autism risk items below M-CHAT-R/F threshold.",
            severityBand: "mild",
          };
    case "SWYC POSI":
      return rawScore >= 3
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "POSI indicates elevated developmental/autism concern.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "POSI does not exceed referral threshold.",
            severityBand: "mild",
          };
    case "CRAFFT":
      return rawScore >= 2
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "Substance use risk exceeds CRAFFT threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "CRAFFT score below threshold.",
            severityBand: "mild",
          };
    case "SCOFF":
      return rawScore >= 2
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "Eating disorder risk exceeds SCOFF threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "SCOFF score below threshold.",
            severityBand: "mild",
          };
    case "ASQ":
      return rawScore >= 1
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "ASQ positive; immediate clinician risk review required.",
            severityBand: "severe",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "ASQ negative screen.",
            severityBand: "none",
          };
    case "PSC-17":
      return rawScore >= 15
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "Broad psychosocial burden exceeds PSC-17 threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "PSC-17 score below threshold.",
            severityBand: "mild",
          };
    case "SWYC":
      return rawScore >= 8
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "SWYC indicates elevated developmental/behavioral concern.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "SWYC score below escalation threshold.",
            severityBand: "mild",
          };
    case "SDQ":
    default:
      return rawScore >= 17
        ? {
            instrumentName,
            rawScore,
            cutoffTriggered: true,
            interpretation: "SDQ score above referral threshold.",
            severityBand: "moderate",
          }
        : {
            instrumentName,
            rawScore,
            cutoffTriggered: false,
            interpretation: "SDQ score below referral threshold.",
            severityBand: "mild",
          };
  }
}

export function buildDecisionUpdateFromInstrument(
  interpretation: InstrumentScoreInterpretation,
  currentUrgency: UrgencyLevel,
): InstrumentDecisionUpdate | null {
  if (!interpretation.cutoffTriggered) {
    return null;
  }

  if (interpretation.instrumentName === "ASQ") {
    return {
      recommendation:
        "ASQ positive screen requires urgent clinician review and safety pathway confirmation.",
      requiresClinicianReview: true,
      urgencyLevel: currentUrgency === "immediate" ? "immediate" : "urgent",
      reasonCode: "INSTRUMENT_CUTOFF_ASQ",
      engineVersion: INSTRUMENT_ENGINE_VERSION,
    };
  }

  return {
    recommendation: `${interpretation.instrumentName} exceeded cutoff. Clinician review is required before final disposition.`,
    requiresClinicianReview: true,
    urgencyLevel: currentUrgency === "routine" ? "priority" : currentUrgency,
    reasonCode: "INSTRUMENT_CUTOFF_TRIGGERED",
    engineVersion: INSTRUMENT_ENGINE_VERSION,
  };
}
