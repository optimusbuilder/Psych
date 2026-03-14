import type { IntakeSessionAggregate } from "../intake/repository";

export const RULE_ENGINE_VERSION = "rules-v1.0.0";

export type AgeBand =
  | "early_childhood"
  | "school_age"
  | "adolescent"
  | "transitional_young_adult"
  | "out_of_range";

export type RespondentModel =
  | "caregiver_only"
  | "caregiver_plus_patient_reconciled"
  | "patient_primary_caregiver_optional"
  | "clinician_review_required";

export type NormalizedSymptomFamily =
  | "mood_depression_irritability"
  | "anxiety_worry_panic_ocd"
  | "attention_hyperactivity_impulsivity"
  | "behavioral_dysregulation_defiance_aggression"
  | "conduct_type_behaviors"
  | "autism_developmental_social"
  | "trauma_stress_related"
  | "eating_body_image"
  | "substance_use"
  | "psychosis_mania_like"
  | "mixed_unclear";

export type SeverityTier = "mild" | "moderate" | "severe" | "unknown";

export type PathwayKey =
  | "immediate_urgent_review"
  | "urgent_specialty_psychiatry"
  | "targeted_screening_and_clinician_review"
  | "pcp_therapy_monitoring"
  | "developmental_evaluation_referral"
  | "substance_use_counseling_referral"
  | "eating_disorder_referral"
  | "clinician_review_required";

export type UrgencyLevel = "routine" | "priority" | "urgent" | "immediate";

export interface RulesInput {
  patientDob: string;
  respondentType?: string | null;
  safetyAssessment?: {
    suicidalRiskFlag: boolean;
    violenceRiskFlag: boolean;
    psychosisManiaFlag: boolean;
    requiresImmediateReview: boolean;
  } | null;
  symptomAssessment?: {
    primaryFamily: string;
    isMixedUnclear: boolean;
  } | null;
  functionalImpact?: {
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
  } | null;
  referenceDate?: Date;
}

export interface RulesResult {
  engineVersion: string;
  ageYears: number;
  ageBand: AgeBand;
  respondentModel: RespondentModel;
  normalizedSymptomFamily: NormalizedSymptomFamily;
  severityTier: SeverityTier;
  highestImpairmentDomain: "home" | "school" | "peer" | "safety_legal" | null;
  pathwayKey: PathwayKey;
  requiresClinicianReview: boolean;
  urgencyLevel: UrgencyLevel;
  recommendation: string;
  reasonCodes: string[];
}

function calculateAgeYears(dob: string, referenceDate: Date) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) {
    return -1;
  }
  let years = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = referenceDate.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && referenceDate.getUTCDate() < birth.getUTCDate())
  ) {
    years -= 1;
  }
  return years;
}

export function determineAgeBand(ageYears: number): AgeBand {
  if (ageYears >= 0 && ageYears <= 5) {
    return "early_childhood";
  }
  if (ageYears >= 6 && ageYears <= 12) {
    return "school_age";
  }
  if (ageYears >= 13 && ageYears <= 17) {
    return "adolescent";
  }
  if (ageYears >= 18 && ageYears <= 25) {
    return "transitional_young_adult";
  }
  return "out_of_range";
}

export function determineRespondentModel(ageBand: AgeBand): RespondentModel {
  if (ageBand === "early_childhood" || ageBand === "school_age") {
    return "caregiver_only";
  }
  if (ageBand === "adolescent") {
    return "caregiver_plus_patient_reconciled";
  }
  if (ageBand === "transitional_young_adult") {
    return "patient_primary_caregiver_optional";
  }
  return "clinician_review_required";
}

export function normalizeSymptomFamily(primaryFamily: string | null | undefined): NormalizedSymptomFamily {
  const value = (primaryFamily ?? "").toLowerCase();
  if (value.includes("mixed") || value.includes("unclear")) {
    return "mixed_unclear";
  }
  if (value.includes("psychosis") || value.includes("mania")) {
    return "psychosis_mania_like";
  }
  if (value.includes("substance")) {
    return "substance_use";
  }
  if (value.includes("eating") || value.includes("body image")) {
    return "eating_body_image";
  }
  if (value.includes("trauma") || value.includes("stress")) {
    return "trauma_stress_related";
  }
  if (value.includes("autism") || value.includes("developmental") || value.includes("social")) {
    return "autism_developmental_social";
  }
  if (value.includes("conduct")) {
    return "conduct_type_behaviors";
  }
  if (value.includes("behavioral") || value.includes("defiance") || value.includes("aggression")) {
    return "behavioral_dysregulation_defiance_aggression";
  }
  if (value.includes("adhd") || value.includes("attention") || value.includes("hyperactivity")) {
    return "attention_hyperactivity_impulsivity";
  }
  if (value.includes("anxiety") || value.includes("worry") || value.includes("panic") || value.includes("ocd")) {
    return "anxiety_worry_panic_ocd";
  }
  if (value.includes("mood") || value.includes("depression") || value.includes("irritability")) {
    return "mood_depression_irritability";
  }
  return "mixed_unclear";
}

export function computeSeverity(
  functionalImpact: RulesInput["functionalImpact"],
): { severityTier: SeverityTier; highestImpairmentDomain: RulesResult["highestImpairmentDomain"] } {
  if (!functionalImpact) {
    return { severityTier: "unknown", highestImpairmentDomain: null };
  }

  const domainScores = [
    { key: "home" as const, score: functionalImpact.homeScore },
    { key: "school" as const, score: functionalImpact.schoolScore },
    { key: "peer" as const, score: functionalImpact.peerScore },
    { key: "safety_legal" as const, score: functionalImpact.safetyLegalScore },
  ];

  let highest = domainScores[0];
  for (const item of domainScores.slice(1)) {
    if (item.score > highest.score) {
      highest = item;
    }
  }

  if (highest.score >= 7) {
    return { severityTier: "severe", highestImpairmentDomain: highest.key };
  }
  if (highest.score >= 4) {
    return { severityTier: "moderate", highestImpairmentDomain: highest.key };
  }
  return { severityTier: "mild", highestImpairmentDomain: highest.key };
}

function recommendationForPathway(pathway: PathwayKey) {
  switch (pathway) {
    case "immediate_urgent_review":
      return "Immediate clinician safety review required. Suspend auto-routing and activate crisis pathway.";
    case "urgent_specialty_psychiatry":
      return "Urgent child/adolescent psychiatry intake is recommended.";
    case "targeted_screening_and_clinician_review":
      return "Targeted screening with clinician review is recommended before final routing.";
    case "developmental_evaluation_referral":
      return "Developmental and autism-focused evaluation referral is recommended.";
    case "substance_use_counseling_referral":
      return "Substance use counseling referral is recommended.";
    case "eating_disorder_referral":
      return "Eating disorder specialty referral is recommended.";
    case "pcp_therapy_monitoring":
      return "PCP follow-up and community therapy monitoring pathway is recommended.";
    case "clinician_review_required":
    default:
      return "Clinician review is required before final routing.";
  }
}

export function evaluateTriageRules(input: RulesInput): RulesResult {
  const referenceDate = input.referenceDate ?? new Date();
  const ageYears = calculateAgeYears(input.patientDob, referenceDate);
  const ageBand = determineAgeBand(ageYears);
  const respondentModel = determineRespondentModel(ageBand);
  const normalizedSymptomFamily = normalizeSymptomFamily(input.symptomAssessment?.primaryFamily);
  const { severityTier, highestImpairmentDomain } = computeSeverity(input.functionalImpact);

  const reasonCodes: string[] = [];
  const safety = input.safetyAssessment;
  const safetyPositive =
    safety?.requiresImmediateReview === true ||
    safety?.suicidalRiskFlag === true ||
    safety?.violenceRiskFlag === true ||
    safety?.psychosisManiaFlag === true;

  if (safetyPositive) {
    reasonCodes.push("SAFETY_OVERRIDE");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "immediate_urgent_review",
      requiresClinicianReview: true,
      urgencyLevel: "immediate",
      recommendation: recommendationForPathway("immediate_urgent_review"),
      reasonCodes,
    };
  }

  if (ageBand === "out_of_range") {
    reasonCodes.push("AGE_OUT_OF_RANGE");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "clinician_review_required",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      recommendation: recommendationForPathway("clinician_review_required"),
      reasonCodes,
    };
  }

  if (input.symptomAssessment?.isMixedUnclear || normalizedSymptomFamily === "mixed_unclear") {
    reasonCodes.push("MIXED_OR_UNCLEAR_PRESENTATION");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "clinician_review_required",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      recommendation: recommendationForPathway("clinician_review_required"),
      reasonCodes,
    };
  }

  if (normalizedSymptomFamily === "psychosis_mania_like") {
    reasonCodes.push("PSYCHOSIS_MANIA_ROUTING");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "urgent_specialty_psychiatry",
      requiresClinicianReview: true,
      urgencyLevel: "urgent",
      recommendation: recommendationForPathway("urgent_specialty_psychiatry"),
      reasonCodes,
    };
  }

  if (severityTier === "severe") {
    reasonCodes.push("SEVERITY_SEVERE");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "urgent_specialty_psychiatry",
      requiresClinicianReview: true,
      urgencyLevel: "urgent",
      recommendation: recommendationForPathway("urgent_specialty_psychiatry"),
      reasonCodes,
    };
  }

  if (
    severityTier === "moderate" ||
    normalizedSymptomFamily === "conduct_type_behaviors" ||
    normalizedSymptomFamily === "behavioral_dysregulation_defiance_aggression"
  ) {
    reasonCodes.push("TARGETED_SCREENING_REQUIRED");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "targeted_screening_and_clinician_review",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      recommendation: recommendationForPathway("targeted_screening_and_clinician_review"),
      reasonCodes,
    };
  }

  if (normalizedSymptomFamily === "autism_developmental_social") {
    reasonCodes.push("DEVELOPMENTAL_REFERRAL");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "developmental_evaluation_referral",
      requiresClinicianReview: false,
      urgencyLevel: "routine",
      recommendation: recommendationForPathway("developmental_evaluation_referral"),
      reasonCodes,
    };
  }

  if (normalizedSymptomFamily === "substance_use") {
    reasonCodes.push("SUBSTANCE_REFERRAL");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "substance_use_counseling_referral",
      requiresClinicianReview: false,
      urgencyLevel: "priority",
      recommendation: recommendationForPathway("substance_use_counseling_referral"),
      reasonCodes,
    };
  }

  if (normalizedSymptomFamily === "eating_body_image") {
    reasonCodes.push("EATING_DISORDER_REFERRAL");
    return {
      engineVersion: RULE_ENGINE_VERSION,
      ageYears,
      ageBand,
      respondentModel,
      normalizedSymptomFamily,
      severityTier,
      highestImpairmentDomain,
      pathwayKey: "eating_disorder_referral",
      requiresClinicianReview: false,
      urgencyLevel: "priority",
      recommendation: recommendationForPathway("eating_disorder_referral"),
      reasonCodes,
    };
  }

  reasonCodes.push("MILD_STANDARD_PATHWAY");
  return {
    engineVersion: RULE_ENGINE_VERSION,
    ageYears,
    ageBand,
    respondentModel,
    normalizedSymptomFamily,
    severityTier,
    highestImpairmentDomain,
    pathwayKey: "pcp_therapy_monitoring",
    requiresClinicianReview: false,
    urgencyLevel: "routine",
    recommendation: recommendationForPathway("pcp_therapy_monitoring"),
    reasonCodes,
  };
}

export function rulesInputFromAggregate(aggregate: IntakeSessionAggregate): RulesInput {
  return {
    patientDob: aggregate.patient.dob,
    respondentType: aggregate.respondent?.type ?? null,
    safetyAssessment: aggregate.safetyAssessment
      ? {
          suicidalRiskFlag: aggregate.safetyAssessment.suicidalRiskFlag,
          violenceRiskFlag: aggregate.safetyAssessment.violenceRiskFlag,
          psychosisManiaFlag: aggregate.safetyAssessment.psychosisManiaFlag,
          requiresImmediateReview: aggregate.safetyAssessment.requiresImmediateReview,
        }
      : null,
    symptomAssessment: aggregate.symptomAssessment
      ? {
          primaryFamily: aggregate.symptomAssessment.primaryFamily,
          isMixedUnclear: aggregate.symptomAssessment.isMixedUnclear,
        }
      : null,
    functionalImpact: aggregate.functionalImpact
      ? {
          homeScore: aggregate.functionalImpact.homeScore,
          schoolScore: aggregate.functionalImpact.schoolScore,
          peerScore: aggregate.functionalImpact.peerScore,
          safetyLegalScore: aggregate.functionalImpact.safetyLegalScore,
        }
      : null,
  };
}
