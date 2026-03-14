import {
  evaluateTriageRules,
  type NormalizedSymptomFamily,
  type RulesInput,
  type RulesResult,
  type SafetyDetailFlags,
  type SpecialtyTrack,
  type UrgencyLevel,
} from "../rules/engine";
import type { FamilyReferralCreateInput } from "./contracts";

const AGE_RANGE_TO_YEARS: Record<FamilyReferralCreateInput["childAge"], number> = {
  "3-5": 4,
  "6-8": 7,
  "9-11": 10,
  "12-14": 13,
  "15-17": 16,
  "18+": 20,
};

const CONCERN_TO_FAMILY: Record<
  FamilyReferralCreateInput["primaryConcerns"][number],
  NormalizedSymptomFamily | "mixed_unclear"
> = {
  anxiety: "anxiety_worry_panic_ocd",
  depression: "mood_depression_irritability",
  anger: "behavioral_dysregulation_defiance_aggression",
  attention: "attention_hyperactivity_impulsivity",
  behavior: "behavioral_dysregulation_defiance_aggression",
  trauma: "trauma_stress_related",
  social: "autism_developmental_social",
  learning: "autism_developmental_social",
  eating: "eating_body_image",
  other: "mixed_unclear",
};

type FamilyScoreMap = Record<NormalizedSymptomFamily, number>;

const EMPTY_FAMILY_SCORES: FamilyScoreMap = {
  mood_depression_irritability: 0,
  anxiety_worry_panic_ocd: 0,
  attention_hyperactivity_impulsivity: 0,
  behavioral_dysregulation_defiance_aggression: 0,
  conduct_type_behaviors: 0,
  autism_developmental_social: 0,
  trauma_stress_related: 0,
  eating_body_image: 0,
  substance_use: 0,
  psychosis_mania_like: 0,
  mixed_unclear: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreConcerns(input: FamilyReferralCreateInput): FamilyScoreMap {
  const scores = { ...EMPTY_FAMILY_SCORES };

  for (const concern of input.primaryConcerns) {
    const family = CONCERN_TO_FAMILY[concern];
    if (family === "mixed_unclear") {
      scores.mixed_unclear += 1.5;
      continue;
    }
    scores[family] += 2.3;

    if (concern === "learning") {
      scores.attention_hyperactivity_impulsivity += 1;
    }
    if (concern === "behavior") {
      scores.conduct_type_behaviors += 0.7;
    }
  }

  switch (input.moodChanges) {
    case "mild":
      scores.mood_depression_irritability += 0.6;
      break;
    case "moderate":
      scores.mood_depression_irritability += 1.1;
      scores.behavioral_dysregulation_defiance_aggression += 0.3;
      break;
    case "severe":
      scores.mood_depression_irritability += 1.7;
      scores.behavioral_dysregulation_defiance_aggression += 0.8;
      break;
    default:
      break;
  }

  switch (input.sleepIssues) {
    case "difficulty-falling":
    case "difficulty-staying":
      scores.anxiety_worry_panic_ocd += 0.5;
      scores.mood_depression_irritability += 0.4;
      break;
    case "sleeping-more":
      scores.mood_depression_irritability += 0.7;
      break;
    case "nightmares":
      scores.trauma_stress_related += 0.8;
      scores.anxiety_worry_panic_ocd += 0.7;
      break;
    default:
      break;
  }

  if (input.appetiteChanges === "restrictive") {
    scores.eating_body_image += 1.3;
  } else if (input.appetiteChanges === "decreased" || input.appetiteChanges === "increased") {
    scores.mood_depression_irritability += 0.4;
  }

  switch (input.socialWithdrawal) {
    case "some":
      scores.anxiety_worry_panic_ocd += 0.5;
      scores.mood_depression_irritability += 0.4;
      break;
    case "significant":
      scores.autism_developmental_social += 1.1;
      scores.mood_depression_irritability += 0.8;
      break;
    case "conflict":
      scores.behavioral_dysregulation_defiance_aggression += 1;
      break;
    default:
      break;
  }

  switch (input.academicImpact) {
    case "mild":
      scores.attention_hyperactivity_impulsivity += 0.7;
      break;
    case "moderate":
      scores.attention_hyperactivity_impulsivity += 1.3;
      scores.anxiety_worry_panic_ocd += 0.4;
      break;
    case "significant":
      scores.attention_hyperactivity_impulsivity += 1.8;
      scores.behavioral_dysregulation_defiance_aggression += 0.9;
      break;
    default:
      break;
  }

  if (input.concernDuration === "more-than-6-months") {
    for (const concern of input.primaryConcerns) {
      const family = CONCERN_TO_FAMILY[concern];
      if (family !== "mixed_unclear") {
        scores[family] += 0.4;
      }
    }
  }

  (Object.keys(scores) as Array<keyof FamilyScoreMap>).forEach((key) => {
    scores[key] = clamp(Number(scores[key].toFixed(2)), 0, 4);
  });

  return scores;
}

function derivePrimaryAndSecondary(
  scores: FamilyScoreMap,
): {
  primaryFamily: string;
  secondaryFamilies: string[];
  isMixedUnclear: boolean;
  insufficientData: boolean;
  mixedSignals: boolean;
} {
  const ranked = (Object.entries(scores) as Array<[NormalizedSymptomFamily, number]>)
    .filter(([family, score]) => family !== "mixed_unclear" && score >= 1.5)
    .sort((a, b) => b[1] - a[1]);

  const top = ranked[0];
  const second = ranked[1];

  const tie = Boolean(top && second && top[1] - second[1] <= 0.5 && second[1] >= 2);
  const insufficientData = !top || top[1] < 2;
  const mixedSignals = scores.mixed_unclear >= 1.5 || tie;
  const isMixedUnclear = mixedSignals || insufficientData;

  if (isMixedUnclear) {
    return {
      primaryFamily: "Mixed / Unclear Presentation",
      secondaryFamilies: ranked.slice(0, 4).map(([family]) => toLabel(family)),
      isMixedUnclear: true,
      insufficientData,
      mixedSignals,
    };
  }

  return {
    primaryFamily: toLabel(top[0]),
    secondaryFamilies: ranked.slice(1, 5).filter((item) => item[1] >= 1.75).map(([family]) => toLabel(family)),
    isMixedUnclear: false,
    insufficientData: false,
    mixedSignals,
  };
}

function toLabel(family: NormalizedSymptomFamily) {
  switch (family) {
    case "mood_depression_irritability":
      return "Mood / Depression / Irritability";
    case "anxiety_worry_panic_ocd":
      return "Anxiety / Worry / Panic / OCD-like";
    case "attention_hyperactivity_impulsivity":
      return "ADHD / Attention / Hyperactivity / Impulsivity";
    case "behavioral_dysregulation_defiance_aggression":
      return "Behavioral Dysregulation / Defiance / Aggression";
    case "conduct_type_behaviors":
      return "Conduct-Type Behaviors";
    case "autism_developmental_social":
      return "Autism / Developmental / Social Communication";
    case "trauma_stress_related":
      return "Trauma / Stress-Related";
    case "eating_body_image":
      return "Eating / Body Image";
    case "substance_use":
      return "Substance Use";
    case "psychosis_mania_like":
      return "Psychosis / Mania-Like";
    default:
      return "Mixed / Unclear Presentation";
  }
}

function toDobFromAgeRange(ageRange: FamilyReferralCreateInput["childAge"], reference: Date) {
  const years = AGE_RANGE_TO_YEARS[ageRange];
  return `${reference.getUTCFullYear() - years}-01-01`;
}

function deriveSafety(input: FamilyReferralCreateInput): NonNullable<RulesInput["safetyAssessment"]> {
  const immediate =
    input.suicidalIdeation === "yes" ||
    input.selfHarmBehavior === "current";

  const urgent =
    immediate ||
    input.selfHarmThoughts === "yes" ||
    input.selfHarmThoughts === "past" ||
    input.suicidalIdeation === "passive" ||
    input.suicidalIdeation === "past" ||
    input.selfHarmBehavior === "past";

  const detailFlags: SafetyDetailFlags = {
    suicidalPlanOrIntent: input.suicidalIdeation === "yes",
    suicideAttemptPast3Months: input.selfHarmBehavior === "current",
  };

  return {
    suicidalRiskFlag: urgent,
    violenceRiskFlag: false,
    psychosisManiaFlag: false,
    requiresImmediateReview: urgent,
    escalationLevel: immediate ? "immediate" : urgent ? "urgent" : "none",
    detailFlags,
  };
}

function mapAcademicScore(value: FamilyReferralCreateInput["academicImpact"] | undefined) {
  switch (value) {
    case "mild":
      return 3;
    case "moderate":
      return 6;
    case "significant":
      return 8;
    case "none":
    default:
      return 1;
  }
}

function mapPeerScore(value: FamilyReferralCreateInput["socialWithdrawal"] | undefined) {
  switch (value) {
    case "some":
      return 4;
    case "significant":
      return 7;
    case "conflict":
      return 6;
    case "normal":
    default:
      return 1;
  }
}

function mapHomeScore(value: FamilyReferralCreateInput["moodChanges"]) {
  switch (value) {
    case "mild":
      return 3;
    case "moderate":
      return 6;
    case "severe":
      return 8;
    case "none":
    default:
      return 1;
  }
}

function mapSafetyLegalScore(input: FamilyReferralCreateInput) {
  if (input.suicidalIdeation === "yes" || input.selfHarmBehavior === "current") {
    return 9;
  }
  if (
    input.selfHarmThoughts === "yes" ||
    input.suicidalIdeation === "passive" ||
    input.suicidalIdeation === "past" ||
    input.selfHarmBehavior === "past"
  ) {
    return 6;
  }
  return 1;
}

export interface FamilyRoutingOutput {
  rulesInput: RulesInput;
  rulesResult: RulesResult;
  specialistType: string;
  specialistDescription: string;
  rationale: string[];
  nextSteps: string[];
}

function specialistForTrack(track: SpecialtyTrack, urgency: UrgencyLevel, input: FamilyReferralCreateInput) {
  if (urgency === "immediate") {
    return {
      specialistType: "Crisis Mental Health Services",
      specialistDescription:
        "Immediate crisis assessment is recommended before routine referral placement.",
    };
  }

  switch (track) {
    case "psychosis_mania_track":
    case "conduct_high_risk_track":
      return {
        specialistType: "Child & Adolescent Psychiatrist",
        specialistDescription:
          "A child psychiatrist is recommended for rapid diagnostic and treatment planning.",
      };
    case "mood_anxiety_track":
      if (input.preferredApproach === "open-medication" || urgency === "urgent") {
        return {
          specialistType: "Child & Adolescent Psychiatrist",
          specialistDescription:
            "Psychiatry evaluation is recommended for mood/anxiety symptoms with higher acuity.",
        };
      }
      return {
        specialistType: "Pediatric Psychologist",
        specialistDescription:
          "A pediatric psychologist can provide evidence-based therapy and diagnostic clarification.",
      };
    case "adhd_externalizing_track":
      return {
        specialistType: "Child Psychologist",
        specialistDescription:
          "A child psychologist can assess attention/externalizing patterns and provide targeted therapy plans.",
      };
    case "trauma_track":
      return {
        specialistType: "Trauma-Specialized Therapist",
        specialistDescription:
          "A therapist trained in trauma-focused interventions is recommended for current concerns.",
      };
    case "developmental_autism_track":
      return {
        specialistType: "Developmental-Behavioral Pediatrician",
        specialistDescription:
          "A developmental specialist can evaluate neurodevelopmental and social-communication needs.",
      };
    case "substance_track":
      return {
        specialistType: "Adolescent Substance Use Program",
        specialistDescription:
          "Substance-focused adolescent services are recommended for integrated behavioral care.",
      };
    case "eating_track":
      return {
        specialistType: "Eating Disorder Specialist Team",
        specialistDescription:
          "A multidisciplinary eating disorder team is recommended to address medical and mental health needs.",
      };
    case "mixed_unclear_track":
    default:
      return {
        specialistType: "Pediatric Psychologist (Comprehensive Evaluation)",
        specialistDescription:
          "A broad psychological evaluation is recommended first to narrow the right specialty path.",
      };
  }
}

const REASON_MESSAGES: Record<string, string> = {
  SAFETY_IMMEDIATE: "Safety responses indicate immediate intervention is needed.",
  SAFETY_URGENT: "Safety responses indicate urgent follow-up is needed.",
  PRIMARY_FAMILY_MOOD: "Mood symptoms appear to be the most impairing concern.",
  PRIMARY_FAMILY_ANXIETY: "Anxiety-related symptoms appear to be the most impairing concern.",
  PRIMARY_FAMILY_ADHD: "Attention and regulation concerns are a primary referral driver.",
  PRIMARY_FAMILY_BEHAVIORAL_DYSREGULATION:
    "Behavioral dysregulation patterns are driving current impairment.",
  PRIMARY_FAMILY_AUTISM_DEVELOPMENTAL:
    "Developmental and social-communication patterns suggest specialist evaluation.",
  PRIMARY_FAMILY_TRAUMA: "Trauma/stress symptoms are strongly represented in the profile.",
  PRIMARY_FAMILY_EATING: "Eating/body image concerns require specialist-focused assessment.",
  PRIMARY_FAMILY_SUBSTANCE: "Substance-related symptoms influence referral prioritization.",
  PRIMARY_FAMILY_PSYCHOSIS_MANIA: "Psychosis/mania indicators require specialty psychiatric review.",
  MIXED_OR_UNCLEAR_PRESENTATION:
    "Multiple concern clusters overlap, so broad evaluation is recommended first.",
  SEVERITY_SEVERE: "Functional impact scores are in the severe range across key domains.",
  SEVERITY_MODERATE: "Functional impact scores suggest moderate impairment.",
  TRAJECTORY_RAPID_WORSENING: "The concern pattern appears to be worsening quickly.",
};

function buildRationale(result: RulesResult, intake: FamilyReferralCreateInput) {
  const reasonLines: string[] = [];
  for (const reasonCode of result.reasonCodes) {
    const message = REASON_MESSAGES[reasonCode];
    if (message) {
      reasonLines.push(message);
    }
  }
  if (intake.familyHistory === "yes") {
    reasonLines.push("Family history details may be relevant for treatment planning.");
  }
  if (reasonLines.length === 0) {
    reasonLines.push("Your intake responses match this specialist pathway.");
  }
  return reasonLines.slice(0, 4);
}

function urgencyWindow(urgency: UrgencyLevel) {
  switch (urgency) {
    case "immediate":
      return "now";
    case "urgent":
      return "within 24-72 hours";
    case "priority":
      return "within 2-4 weeks";
    case "routine":
    default:
      return "as soon as a routine slot is available";
  }
}

function buildNextSteps(result: RulesResult, specialistType: string) {
  if (result.urgencyLevel === "immediate") {
    return [
      "Call 911 now if there is immediate danger.",
      "Call or text 988 for immediate mental health crisis support.",
      "Do not leave the child alone while arranging emergency support.",
      "Share this referral summary with emergency or urgent care staff.",
    ];
  }
  return [
    `Request an appointment with a ${specialistType.toLowerCase()} ${urgencyWindow(result.urgencyLevel)}.`,
    "Use the referral PDF summary when contacting clinics or your pediatrician.",
    "Verify insurance network and referral requirements before booking.",
    "If safety worsens before the appointment, call 988 or 911 immediately.",
  ];
}

export function buildRulesInputFromFamilyIntake(
  input: FamilyReferralCreateInput,
  referenceDate: Date = new Date(),
): RulesInput {
  const familyScores = scoreConcerns(input);
  const symptomSelection = derivePrimaryAndSecondary(familyScores);
  const homeScore = mapHomeScore(input.moodChanges);
  const schoolScore = mapAcademicScore(input.academicImpact);
  const peerScore = mapPeerScore(input.socialWithdrawal);
  const safetyLegalScore = mapSafetyLegalScore(input);
  const rapidWorsening =
    input.concernDuration === "less-than-1-month" &&
    (input.moodChanges === "severe" || input.suicidalIdeation === "yes");

  return {
    patientDob: toDobFromAgeRange(input.childAge, referenceDate),
    respondentType: "caregiver",
    communicationProfile: "unknown",
    developmentalDelayConcern: input.primaryConcerns.includes("learning"),
    autismConcern: input.primaryConcerns.includes("social"),
    safetyAssessment: deriveSafety(input),
    symptomAssessment: {
      primaryFamily: symptomSelection.primaryFamily,
      secondaryFamilies: symptomSelection.secondaryFamilies,
      isMixedUnclear: symptomSelection.isMixedUnclear,
      familyScores,
      mostImpairingConcern: symptomSelection.primaryFamily,
      insufficientData: symptomSelection.insufficientData,
      mixedSignals: symptomSelection.mixedSignals,
    },
    functionalImpact: {
      homeScore,
      schoolScore,
      peerScore,
      safetyLegalScore,
      rapidWorsening,
    },
  };
}

export function createFamilyRoutingOutput(
  input: FamilyReferralCreateInput,
  referenceDate: Date = new Date(),
): FamilyRoutingOutput {
  const rulesInput = buildRulesInputFromFamilyIntake(input, referenceDate);
  const rulesResult = evaluateTriageRules(rulesInput);
  const specialist = specialistForTrack(rulesResult.specialtyTrack, rulesResult.urgencyLevel, input);
  const rationale = buildRationale(rulesResult, input);
  const nextSteps = buildNextSteps(rulesResult, specialist.specialistType);

  return {
    rulesInput,
    rulesResult,
    specialistType: specialist.specialistType,
    specialistDescription: specialist.specialistDescription,
    rationale,
    nextSteps,
  };
}
