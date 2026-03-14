import type { IntakeSessionAggregate } from "../intake/repository";

export const RULE_ENGINE_VERSION = "rules-v1.1.0";

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

export type CommunicationProfile =
  | "verbal_typical"
  | "limited_verbal"
  | "nonverbal"
  | "unknown";

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

export type SeverityTier = "mild" | "moderate" | "severe" | "unclear";

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

export type SpecialtyTrack =
  | "mood_anxiety_track"
  | "adhd_externalizing_track"
  | "conduct_high_risk_track"
  | "trauma_track"
  | "developmental_autism_track"
  | "substance_track"
  | "eating_track"
  | "psychosis_mania_track"
  | "mixed_unclear_track";

export type SafetyGate = "clear" | "urgent" | "immediate";

type DomainKey = "home" | "school" | "peer" | "safety_legal";

export interface SafetyDetailFlags {
  immediateDangerNow?: boolean;
  suicidalPlanOrIntent?: boolean;
  suicideAttemptPast3Months?: boolean;
  violentPlan?: boolean;
  violentTarget?: boolean;
  violentMeansAccess?: boolean;
  fireSetting?: boolean;
  weaponUseOrAccessForHarm?: boolean;
  severeIntoxicationWithdrawalOverdose?: boolean;
  severePsychosisManiaDisorganization?: boolean;
  abuseNeglectConcern?: boolean;
}

export interface ConductRedFlags {
  cruelty?: boolean;
  fireSetting?: boolean;
  weaponIncident?: boolean;
  seriousViolenceHistory?: boolean;
}

export interface RulesInput {
  patientDob: string;
  respondentType?: string | null;
  communicationProfile?: CommunicationProfile | null;
  developmentalDelayConcern?: boolean;
  autismConcern?: boolean;
  safetyAssessment?: {
    suicidalRiskFlag: boolean;
    violenceRiskFlag: boolean;
    psychosisManiaFlag: boolean;
    requiresImmediateReview: boolean;
    escalationLevel?: "none" | "urgent" | "immediate";
    detailFlags?: SafetyDetailFlags;
  } | null;
  symptomAssessment?: {
    primaryFamily: string;
    secondaryFamilies?: string[];
    isMixedUnclear: boolean;
    familyScores?: Record<string, number>;
    mostImpairingConcern?: string | null;
    insufficientData?: boolean;
    mixedSignals?: boolean;
    conductRedFlags?: ConductRedFlags;
  } | null;
  functionalImpact?: {
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
    rapidWorsening?: boolean;
  } | null;
  referenceDate?: Date;
  aiExtractedInsights?: string[];
}

export interface RulesResult {
  engineVersion: string;
  ageYears: number;
  ageBand: AgeBand;
  respondentModel: RespondentModel;
  communicationProfile: CommunicationProfile;
  safetyGate: SafetyGate;
  normalizedSymptomFamily: NormalizedSymptomFamily;
  secondarySymptomFamilies: NormalizedSymptomFamily[];
  isMixedUnclear: boolean;
  severityTier: SeverityTier;
  highestImpairmentDomain: DomainKey | null;
  pathwayKey: PathwayKey;
  specialtyTrack: SpecialtyTrack;
  requiresClinicianReview: boolean;
  urgencyLevel: UrgencyLevel;
  acuityScore: number;
  aiInsights: string[];
  recommendation: string;
  reasonCodes: string[];
  insufficientData: boolean;
}

const FAMILY_ORDER: NormalizedSymptomFamily[] = [
  "psychosis_mania_like",
  "conduct_type_behaviors",
  "substance_use",
  "eating_body_image",
  "trauma_stress_related",
  "autism_developmental_social",
  "mood_depression_irritability",
  "anxiety_worry_panic_ocd",
  "attention_hyperactivity_impulsivity",
  "behavioral_dysregulation_defiance_aggression",
  "mixed_unclear",
];

function familyPriority(family: NormalizedSymptomFamily) {
  const index = FAMILY_ORDER.indexOf(family);
  return index >= 0 ? index : FAMILY_ORDER.length;
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

export function determineRespondentModel(
  ageBand: AgeBand,
  communicationProfile: CommunicationProfile = "unknown",
): RespondentModel {
  if (communicationProfile === "limited_verbal" || communicationProfile === "nonverbal") {
    return "caregiver_only";
  }
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

function normalizeFamilyString(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSymptomFamily(
  primaryFamily: string | null | undefined,
): NormalizedSymptomFamily {
  const value = normalizeFamilyString(primaryFamily ?? "");

  if (
    value.includes("mixed") ||
    value.includes("unclear") ||
    value.includes("multiple")
  ) {
    return "mixed_unclear";
  }

  if (
    value.includes("psychosis") ||
    value.includes("mania") ||
    value.includes("hallucination") ||
    value.includes("delusion")
  ) {
    return "psychosis_mania_like";
  }

  if (
    value.includes("substance") ||
    value.includes("crafft") ||
    value.includes("alcohol") ||
    value.includes("drug")
  ) {
    return "substance_use";
  }

  if (value.includes("eating") || value.includes("body image") || value.includes("scoff")) {
    return "eating_body_image";
  }

  if (value.includes("trauma") || value.includes("ptsd") || value.includes("stress")) {
    return "trauma_stress_related";
  }

  if (
    value.includes("autism") ||
    value.includes("developmental") ||
    value.includes("social communication") ||
    value === "social"
  ) {
    return "autism_developmental_social";
  }

  if (value.includes("conduct")) {
    return "conduct_type_behaviors";
  }

  if (
    value.includes("behavioral") ||
    value.includes("defiance") ||
    value.includes("aggression") ||
    value.includes("dysregulation")
  ) {
    return "behavioral_dysregulation_defiance_aggression";
  }

  if (
    value.includes("adhd") ||
    value.includes("attention") ||
    value.includes("hyperactivity") ||
    value.includes("impulsivity")
  ) {
    return "attention_hyperactivity_impulsivity";
  }

  if (
    value.includes("anxiety") ||
    value.includes("worry") ||
    value.includes("panic") ||
    value.includes("ocd")
  ) {
    return "anxiety_worry_panic_ocd";
  }

  if (
    value.includes("depression") ||
    value.includes("mood") ||
    value.includes("irritability")
  ) {
    return "mood_depression_irritability";
  }

  return "mixed_unclear";
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function safetyGateFromInput(
  safetyAssessment: RulesInput["safetyAssessment"],
): { gate: SafetyGate; reasonCodes: string[]; conductHighRisk: boolean } {
  const reasonCodes: string[] = [];
  const details = safetyAssessment?.detailFlags ?? {};

  const immediate =
    safetyAssessment?.escalationLevel === "immediate" ||
    Boolean(details.immediateDangerNow) ||
    Boolean(details.suicidalPlanOrIntent) ||
    Boolean(details.suicideAttemptPast3Months) ||
    Boolean(details.violentPlan) ||
    Boolean(details.fireSetting) ||
    Boolean(details.weaponUseOrAccessForHarm) ||
    Boolean(details.severeIntoxicationWithdrawalOverdose) ||
    Boolean(details.severePsychosisManiaDisorganization) ||
    (Boolean(details.violentTarget) && Boolean(details.violentMeansAccess));

  const urgent =
    immediate ||
    safetyAssessment?.escalationLevel === "urgent" ||
    safetyAssessment?.requiresImmediateReview === true ||
    safetyAssessment?.suicidalRiskFlag === true ||
    safetyAssessment?.violenceRiskFlag === true ||
    safetyAssessment?.psychosisManiaFlag === true ||
    Boolean(details.abuseNeglectConcern) ||
    Boolean(details.violentTarget) ||
    Boolean(details.violentMeansAccess);

  const gate: SafetyGate = immediate ? "immediate" : urgent ? "urgent" : "clear";

  if (gate === "immediate") {
    reasonCodes.push("SAFETY_IMMEDIATE");
  } else if (gate === "urgent") {
    reasonCodes.push("SAFETY_URGENT");
  } else {
    reasonCodes.push("SAFETY_CLEAR");
  }

  if (safetyAssessment?.suicidalRiskFlag) {
    reasonCodes.push("SAFETY_SUICIDAL_POSITIVE");
  }
  if (safetyAssessment?.violenceRiskFlag) {
    reasonCodes.push("SAFETY_VIOLENCE_POSITIVE");
  }
  if (safetyAssessment?.psychosisManiaFlag) {
    reasonCodes.push("SAFETY_PSYCHOSIS_MANIA_POSITIVE");
  }
  if (details.abuseNeglectConcern) {
    reasonCodes.push("SAFETY_ABUSE_NEGLECT_POSITIVE");
  }

  const conductHighRisk = Boolean(details.fireSetting || details.weaponUseOrAccessForHarm);

  return {
    gate,
    reasonCodes,
    conductHighRisk,
  };
}

function normalizedFamilyReasonCode(family: NormalizedSymptomFamily) {
  switch (family) {
    case "mood_depression_irritability":
      return "PRIMARY_FAMILY_MOOD";
    case "anxiety_worry_panic_ocd":
      return "PRIMARY_FAMILY_ANXIETY";
    case "attention_hyperactivity_impulsivity":
      return "PRIMARY_FAMILY_ADHD";
    case "behavioral_dysregulation_defiance_aggression":
      return "PRIMARY_FAMILY_BEHAVIORAL_DYSREGULATION";
    case "conduct_type_behaviors":
      return "PRIMARY_FAMILY_CONDUCT";
    case "autism_developmental_social":
      return "PRIMARY_FAMILY_AUTISM_DEVELOPMENTAL";
    case "trauma_stress_related":
      return "PRIMARY_FAMILY_TRAUMA";
    case "eating_body_image":
      return "PRIMARY_FAMILY_EATING";
    case "substance_use":
      return "PRIMARY_FAMILY_SUBSTANCE";
    case "psychosis_mania_like":
      return "PRIMARY_FAMILY_PSYCHOSIS_MANIA";
    default:
      return "PRIMARY_FAMILY_MIXED_UNCLEAR";
  }
}

function specialtyTrackForFamily(family: NormalizedSymptomFamily): SpecialtyTrack {
  switch (family) {
    case "mood_depression_irritability":
    case "anxiety_worry_panic_ocd":
      return "mood_anxiety_track";
    case "attention_hyperactivity_impulsivity":
    case "behavioral_dysregulation_defiance_aggression":
      return "adhd_externalizing_track";
    case "conduct_type_behaviors":
      return "conduct_high_risk_track";
    case "trauma_stress_related":
      return "trauma_track";
    case "autism_developmental_social":
      return "developmental_autism_track";
    case "substance_use":
      return "substance_track";
    case "eating_body_image":
      return "eating_track";
    case "psychosis_mania_like":
      return "psychosis_mania_track";
    default:
      return "mixed_unclear_track";
  }
}

function severityReasonCode(severity: SeverityTier) {
  switch (severity) {
    case "mild":
      return "SEVERITY_MILD";
    case "moderate":
      return "SEVERITY_MODERATE";
    case "severe":
      return "SEVERITY_SEVERE";
    default:
      return "SEVERITY_UNCLEAR";
  }
}

function routeReasonCode(pathway: PathwayKey) {
  switch (pathway) {
    case "immediate_urgent_review":
      return "ROUTE_IMMEDIATE_URGENT_REVIEW";
    case "urgent_specialty_psychiatry":
      return "ROUTE_URGENT_SPECIALTY_PSYCHIATRY";
    case "targeted_screening_and_clinician_review":
      return "ROUTE_TARGETED_SCREENING";
    case "pcp_therapy_monitoring":
      return "ROUTE_PCP_THERAPY_MONITORING";
    case "developmental_evaluation_referral":
      return "ROUTE_DEVELOPMENTAL_EVALUATION";
    case "substance_use_counseling_referral":
      return "ROUTE_SUBSTANCE_REFERRAL";
    case "eating_disorder_referral":
      return "ROUTE_EATING_REFERRAL";
    case "clinician_review_required":
    default:
      return "ROUTE_CLINICIAN_REVIEW_REQUIRED";
  }
}

interface SymptomSelection {
  primaryFamily: NormalizedSymptomFamily;
  secondaryFamilies: NormalizedSymptomFamily[];
  isMixedUnclear: boolean;
  insufficientData: boolean;
  reasonCodes: string[];
}

function parseFamilyScoreMap(
  familyScores: Record<string, number> | undefined,
): Map<NormalizedSymptomFamily, number> {
  const scoreMap = new Map<NormalizedSymptomFamily, number>();
  if (!familyScores) {
    return scoreMap;
  }

  for (const [rawKey, rawValue] of Object.entries(familyScores)) {
    const numeric = toFiniteNumber(rawValue);
    if (numeric === null) {
      continue;
    }
    const normalized = normalizeSymptomFamily(rawKey);
    if (normalized === "mixed_unclear") {
      continue;
    }
    const bounded = Math.max(0, Math.min(4, numeric));
    const previous = scoreMap.get(normalized) ?? -1;
    if (bounded > previous) {
      scoreMap.set(normalized, bounded);
    }
  }

  return scoreMap;
}

function choosePrimaryFromScores(
  scoredFamilies: Array<{ family: NormalizedSymptomFamily; score: number }>,
  mostImpairingConcern: string | null | undefined,
): { primary: NormalizedSymptomFamily; unresolvedTie: boolean } | null {
  if (scoredFamilies.length === 0) {
    return null;
  }

  const top = scoredFamilies[0];
  const second = scoredFamilies[1];
  const tie = Boolean(second && top.score - second.score <= 0.5);

  if (!tie) {
    return { primary: top.family, unresolvedTie: false };
  }

  const mostImpairing = normalizeSymptomFamily(mostImpairingConcern);
  if (
    mostImpairing !== "mixed_unclear" &&
    scoredFamilies
      .filter((item) => top.score - item.score <= 0.5)
      .some((item) => item.family === mostImpairing)
  ) {
    return {
      primary: mostImpairing,
      unresolvedTie: false,
    };
  }

  return {
    primary: top.family,
    unresolvedTie: true,
  };
}

function deriveSymptomSelection(
  symptomAssessment: RulesInput["symptomAssessment"],
): SymptomSelection {
  if (!symptomAssessment) {
    return {
      primaryFamily: "mixed_unclear",
      secondaryFamilies: [],
      isMixedUnclear: true,
      insufficientData: true,
      reasonCodes: ["PRIMARY_FAMILY_MIXED_UNCLEAR", "INSUFFICIENT_DATA_SYMPTOM_SECTION"],
    };
  }

  const reasonCodes: string[] = [];
  const scoreMap = parseFamilyScoreMap(symptomAssessment.familyScores);

  const selectedFromLabels = [
    normalizeSymptomFamily(symptomAssessment.primaryFamily),
    ...(symptomAssessment.secondaryFamilies ?? []).map((label) => normalizeSymptomFamily(label)),
  ].filter((family): family is NormalizedSymptomFamily => family !== "mixed_unclear");

  for (const family of selectedFromLabels) {
    if (!scoreMap.has(family)) {
      scoreMap.set(family, family === normalizeSymptomFamily(symptomAssessment.primaryFamily) ? 2 : 1.75);
    }
  }

  const scoredFamilies = Array.from(scoreMap.entries())
    .map(([family, score]) => ({ family, score }))
    .filter((item) => item.score >= 1.5)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return familyPriority(a.family) - familyPriority(b.family);
    });

  const picked = choosePrimaryFromScores(scoredFamilies, symptomAssessment.mostImpairingConcern);

  const top = scoredFamilies[0];
  const second = scoredFamilies[1];
  const highSecondaryCount = scoredFamilies.filter((item) => item.score >= 1.75).length;
  const dominantLead = top && second ? top.score - second.score : 1;

  const forcedMixedByScores =
    Boolean(top && second && top.score >= 2 && second.score >= 2 && top.score - second.score <= 0.5) ||
    Boolean(highSecondaryCount >= 3 && dominantLead <= 0.75);

  const insufficientDataByThreshold = !top || top.score < 2;
  const insufficientData =
    symptomAssessment.insufficientData === true ||
    insufficientDataByThreshold ||
    scoredFamilies.length === 0;

  let isMixedUnclear =
    symptomAssessment.isMixedUnclear === true ||
    symptomAssessment.mixedSignals === true ||
    forcedMixedByScores ||
    Boolean(picked?.unresolvedTie) ||
    (scoredFamilies.length > 1 && insufficientData);

  let primaryFamily = picked?.primary ?? normalizeSymptomFamily(symptomAssessment.primaryFamily);
  if (insufficientData || primaryFamily === "mixed_unclear") {
    isMixedUnclear = true;
    primaryFamily = "mixed_unclear";
  }
  if (isMixedUnclear) {
    primaryFamily = "mixed_unclear";
  }

  const secondaryFamilies = scoredFamilies
    .filter((item) => item.family !== primaryFamily && item.score >= 1.75)
    .map((item) => item.family)
    .slice(0, 4);

  reasonCodes.push(normalizedFamilyReasonCode(primaryFamily));
  if (isMixedUnclear) {
    reasonCodes.push("MIXED_OR_UNCLEAR_PRESENTATION");
  }
  if (insufficientData) {
    reasonCodes.push("INSUFFICIENT_DATA_SYMPTOM_SECTION");
  }

  return {
    primaryFamily,
    secondaryFamilies,
    isMixedUnclear,
    insufficientData,
    reasonCodes,
  };
}

export function computeSeverity(
  functionalImpact: RulesInput["functionalImpact"],
  options: {
    conductHighRisk: boolean;
    psychosisMarker: boolean;
  },
): {
  severityTier: SeverityTier;
  highestImpairmentDomain: RulesResult["highestImpairmentDomain"];
  domainScores: Record<DomainKey, number> | null;
  baseFunctionalAcuity: number;
} {
  if (!functionalImpact) {
    return {
      severityTier: "unclear",
      highestImpairmentDomain: null,
      domainScores: null,
      baseFunctionalAcuity: 0,
    };
  }

  const domainScores: Record<DomainKey, number> = {
    home: functionalImpact.homeScore,
    school: functionalImpact.schoolScore,
    peer: functionalImpact.peerScore,
    safety_legal: functionalImpact.safetyLegalScore,
  };

  const values = Object.values(domainScores);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 10)) {
    return {
      severityTier: "unclear",
      highestImpairmentDomain: null,
      domainScores,
      baseFunctionalAcuity: 0,
    };
  }

  const priorityOrder: DomainKey[] = ["safety_legal", "school", "home", "peer"];
  let highestDomain: DomainKey = priorityOrder[0];
  let highestValue = domainScores[highestDomain];

  for (const domain of priorityOrder.slice(1)) {
    const value = domainScores[domain];
    if (value > highestValue) {
      highestValue = value;
      highestDomain = domain;
    }
  }

  const domainsAtLeast7 = values.filter((value) => value >= 7).length;
  const domainsAtLeast4 = values.filter((value) => value >= 4).length;

  const severe = highestValue >= 8 || domainScores.safety_legal >= 7 || domainsAtLeast7 >= 2;
  const moderate = !severe && (highestValue >= 4 || domainsAtLeast4 >= 2);
  const mild =
    !severe &&
    !moderate &&
    values.every((value) => value <= 3) &&
    !options.conductHighRisk &&
    !options.psychosisMarker;

  const severityTier: SeverityTier = severe ? "severe" : moderate ? "moderate" : mild ? "mild" : "unclear";

  // Calculate a base functional acuity score (0-40 points roughly from function)
  const baseFunctionalAcuity = Math.round(
    (domainScores.safety_legal * 1.5) +
    (domainScores.school * 1.2) +
    (domainScores.home * 1.0) +
    (domainScores.peer * 0.8)
  );

  return {
    severityTier,
    highestImpairmentDomain: highestDomain,
    domainScores,
    baseFunctionalAcuity,
  };
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

function maxUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  const order: UrgencyLevel[] = ["routine", "priority", "urgent", "immediate"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export function evaluateTriageRules(input: RulesInput): RulesResult {
  const referenceDate = input.referenceDate ?? new Date();
  const ageYears = calculateAgeYears(input.patientDob, referenceDate);
  const ageBand = determineAgeBand(ageYears);

  const communicationProfile = input.communicationProfile ?? "unknown";
  const respondentModel = determineRespondentModel(ageBand, communicationProfile);

  const safety = safetyGateFromInput(input.safetyAssessment);
  const symptomSelection = deriveSymptomSelection(input.symptomAssessment);
  const psychosisMarker =
    input.safetyAssessment?.psychosisManiaFlag === true ||
    symptomSelection.primaryFamily === "psychosis_mania_like";

  const symptomConductHighRisk =
    input.symptomAssessment?.conductRedFlags?.cruelty === true ||
    input.symptomAssessment?.conductRedFlags?.fireSetting === true ||
    input.symptomAssessment?.conductRedFlags?.weaponIncident === true ||
    (input.symptomAssessment?.conductRedFlags?.seriousViolenceHistory === true &&
      symptomSelection.primaryFamily === "conduct_type_behaviors");

  const conductHighRisk = safety.conductHighRisk || symptomConductHighRisk;

  const severity = computeSeverity(input.functionalImpact, {
    conductHighRisk,
    psychosisMarker,
  });

  const reasonCodes: string[] = [
    ...safety.reasonCodes,
    ...symptomSelection.reasonCodes,
    severityReasonCode(severity.severityTier),
  ];

  let pathwayKey: PathwayKey = "pcp_therapy_monitoring";
  let urgencyLevel: UrgencyLevel = "routine";
  let requiresClinicianReview = false;
  let specialtyTrack: SpecialtyTrack = specialtyTrackForFamily(symptomSelection.primaryFamily);

  // --- ACUITY SCORE CALCULATION ---
  // Base Functional Acuity is 0-40.
  let acuityScore = severity.baseFunctionalAcuity;

  // Add symptom baseline
  if (severity.severityTier === "severe") acuityScore += 30;
  else if (severity.severityTier === "moderate") acuityScore += 15;
  else if (severity.severityTier === "mild") acuityScore += 5;

  // Cross-Domain Interaction Multipliers
  // 1. Dual Diagnosis Risk
  const hasSubstanceUse = symptomSelection.primaryFamily === "substance_use" || symptomSelection.secondaryFamilies.includes("substance_use");
  const hasMoodOrAnxiety =
    symptomSelection.primaryFamily === "mood_depression_irritability" ||
    symptomSelection.secondaryFamilies.includes("mood_depression_irritability") ||
    symptomSelection.primaryFamily === "anxiety_worry_panic_ocd" ||
    symptomSelection.secondaryFamilies.includes("anxiety_worry_panic_ocd");

  if (hasSubstanceUse && hasMoodOrAnxiety) {
    acuityScore += 15;
    reasonCodes.push("ACUITY_MULTIPLIER_DUAL_DIAGNOSIS");
  }

  // 2. High-Risk Behavioral Cascade
  const hasConduct = symptomSelection.primaryFamily === "conduct_type_behaviors" || symptomSelection.secondaryFamilies.includes("conduct_type_behaviors");
  if (hasConduct && (input.functionalImpact?.schoolScore ?? 0) + (input.functionalImpact?.safetyLegalScore ?? 0) > 10) {
    acuityScore += 20;
    reasonCodes.push("ACUITY_MULTIPLIER_BEHAVIORAL_CASCADE");
  }

  // 3. Trajectory Multipliers
  if (input.functionalImpact?.rapidWorsening) {
    acuityScore = Math.round(acuityScore * 1.2);
    reasonCodes.push("TRAJECTORY_RAPID_WORSENING");
  }

  if (safety.gate === "immediate" || safety.gate === "urgent") {
    acuityScore += 30; // Implicit bump for absolute safety
  }

  acuityScore = Math.min(100, Math.max(0, acuityScore));
  // --------------------------------

  if (safety.gate === "immediate" || safety.gate === "urgent") {
    pathwayKey = "immediate_urgent_review";
    urgencyLevel = safety.gate === "immediate" ? "immediate" : "urgent";
    requiresClinicianReview = true;
    reasonCodes.push("SAFETY_OVERRIDE");
  } else if (ageBand === "out_of_range") {
    pathwayKey = "clinician_review_required";
    urgencyLevel = "priority";
    requiresClinicianReview = true;
    specialtyTrack = "mixed_unclear_track";
    reasonCodes.push("AGE_OUT_OF_RANGE");
  } else if (symptomSelection.primaryFamily === "psychosis_mania_like") {
    pathwayKey = "urgent_specialty_psychiatry";
    urgencyLevel = "urgent";
    requiresClinicianReview = true;
    specialtyTrack = "psychosis_mania_track";
    reasonCodes.push("PSYCHOSIS_MANIA_ROUTING");
  } else if (conductHighRisk) {
    pathwayKey = "urgent_specialty_psychiatry";
    urgencyLevel = "urgent";
    requiresClinicianReview = true;
    specialtyTrack = "conduct_high_risk_track";
    reasonCodes.push("CONDUCT_HIGH_RISK_ESCALATION");
  } else {
    // Dynamic Pathway Stratification based on Acuity Score
    if (acuityScore >= 65) {
      pathwayKey = "urgent_specialty_psychiatry";
      urgencyLevel = "urgent";
      requiresClinicianReview = true;
    } else if (acuityScore >= 40) {
      pathwayKey = "targeted_screening_and_clinician_review";
      urgencyLevel = "priority";
      requiresClinicianReview = true;
    } else if (acuityScore > 0 && acuityScore < 40 && severity.severityTier !== "unclear") {
      pathwayKey = "pcp_therapy_monitoring";
      urgencyLevel = "routine";
      requiresClinicianReview = false;
    } else {
      // fallback for unclear scenarios
      pathwayKey = "clinician_review_required";
      urgencyLevel = "priority";
      requiresClinicianReview = true;
    }

    if (pathwayKey !== "urgent_specialty_psychiatry") {
      if (symptomSelection.primaryFamily === "substance_use") {
        pathwayKey = "substance_use_counseling_referral";
        urgencyLevel = maxUrgency(urgencyLevel, "priority");
        requiresClinicianReview = requiresClinicianReview || acuityScore >= 40;
      } else if (symptomSelection.primaryFamily === "eating_body_image") {
        pathwayKey = "eating_disorder_referral";
        urgencyLevel = maxUrgency(urgencyLevel, "priority");
        requiresClinicianReview = requiresClinicianReview || acuityScore >= 40;
      } else if (
        symptomSelection.primaryFamily === "autism_developmental_social" ||
        input.autismConcern === true
      ) {
        pathwayKey = "developmental_evaluation_referral";
        urgencyLevel = maxUrgency(urgencyLevel, acuityScore >= 40 ? "priority" : "routine");
      }
    }

    if (symptomSelection.isMixedUnclear || symptomSelection.insufficientData) {
      pathwayKey = "clinician_review_required";
      urgencyLevel = maxUrgency(urgencyLevel, "priority");
      requiresClinicianReview = true;
      specialtyTrack = "mixed_unclear_track";
    }
  }

  if (input.functionalImpact?.rapidWorsening && acuityScore < 40) {
    reasonCodes.push("FOLLOW_UP_WINDOW_14_DAYS");
  }

  reasonCodes.push(routeReasonCode(pathwayKey));

  const uniqueReasonCodes = Array.from(new Set(reasonCodes));

  return {
    engineVersion: RULE_ENGINE_VERSION,
    ageYears,
    ageBand,
    respondentModel,
    communicationProfile,
    safetyGate: safety.gate,
    normalizedSymptomFamily: symptomSelection.primaryFamily,
    secondarySymptomFamilies: symptomSelection.secondaryFamilies,
    isMixedUnclear: symptomSelection.isMixedUnclear,
    severityTier: severity.severityTier,
    highestImpairmentDomain: severity.highestImpairmentDomain,
    pathwayKey,
    specialtyTrack,
    requiresClinicianReview,
    urgencyLevel,
    acuityScore,
    aiInsights: input.aiExtractedInsights || [],
    recommendation: recommendationForPathway(pathwayKey),
    reasonCodes: uniqueReasonCodes,
    insufficientData: symptomSelection.insufficientData || severity.severityTier === "unclear",
  };
}

export function rulesInputFromAggregate(aggregate: IntakeSessionAggregate): RulesInput {
  return {
    patientDob: aggregate.patient.dob,
    respondentType: aggregate.referringProvider ? "clinician" : null,
    communicationProfile: aggregate.referringProvider?.communicationProfile ?? null,
    developmentalDelayConcern: aggregate.referringProvider?.developmentalDelayConcern ?? false,
    autismConcern: aggregate.referringProvider?.autismConcern ?? false,
    safetyAssessment: aggregate.safetyAssessment
      ? {
        suicidalRiskFlag: aggregate.safetyAssessment.suicidalRiskFlag,
        violenceRiskFlag: aggregate.safetyAssessment.violenceRiskFlag,
        psychosisManiaFlag: aggregate.safetyAssessment.psychosisManiaFlag,
        requiresImmediateReview: aggregate.safetyAssessment.requiresImmediateReview,
        escalationLevel:
          aggregate.safetyAssessment.escalationLevel === "none" ||
            aggregate.safetyAssessment.escalationLevel === "urgent" ||
            aggregate.safetyAssessment.escalationLevel === "immediate"
            ? aggregate.safetyAssessment.escalationLevel
            : "none",
        detailFlags: aggregate.safetyAssessment.detailFlags,
      }
      : null,
    symptomAssessment: aggregate.symptomAssessment
      ? {
        primaryFamily: aggregate.symptomAssessment.primaryFamily,
        secondaryFamilies: aggregate.symptomAssessment.secondaryFamilies,
        isMixedUnclear: aggregate.symptomAssessment.isMixedUnclear,
        familyScores: aggregate.symptomAssessment.familyScores,
        mostImpairingConcern: aggregate.symptomAssessment.mostImpairingConcern,
        insufficientData: aggregate.symptomAssessment.insufficientData,
        mixedSignals: aggregate.symptomAssessment.mixedSignals,
        conductRedFlags: aggregate.symptomAssessment.conductRedFlags,
      }
      : null,
    functionalImpact: aggregate.functionalImpact
      ? {
        homeScore: aggregate.functionalImpact.homeScore,
        schoolScore: aggregate.functionalImpact.schoolScore,
        peerScore: aggregate.functionalImpact.peerScore,
        safetyLegalScore: aggregate.functionalImpact.safetyLegalScore,
        rapidWorsening: aggregate.functionalImpact.rapidWorsening,
      }
      : null,
  };
}
