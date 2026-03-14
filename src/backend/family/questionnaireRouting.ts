import {
  evaluateTriageRules,
  normalizeSymptomFamily,
  type NormalizedSymptomFamily,
  type RulesInput,
} from "../rules/engine";
import type {
  FamilyQuestionAnswerInput,
  FamilyQuestionnaireSubmissionInput,
  FamilyQuestionResponseInput,
} from "./contracts";
import {
  createFamilyRecommendationFromRulesResult,
  type FamilyRoutingOutput,
} from "./routing";

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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function parseAgeYears(value: string, referenceDate: Date) {
  const trimmed = value.trim();
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    let years = referenceDate.getUTCFullYear() - date.getUTCFullYear();
    const monthDelta = referenceDate.getUTCMonth() - date.getUTCMonth();
    if (
      monthDelta < 0 ||
      (monthDelta === 0 && referenceDate.getUTCDate() < date.getUTCDate())
    ) {
      years -= 1;
    }
    if (years >= 0 && years <= 120) {
      return years;
    }
  }

  const numericMatch = trimmed.match(/\d{1,2}/);
  if (!numericMatch) {
    return null;
  }
  const years = Number.parseInt(numericMatch[0], 10);
  if (!Number.isFinite(years) || years < 0 || years > 120) {
    return null;
  }
  return years;
}

function scoreFromSeverity(value: string | undefined | null) {
  switch (value) {
    case "mild":
      return 3;
    case "moderate":
      return 6;
    case "severe":
      return 9;
    default:
      return null;
  }
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

function toDob(ageYears: number, referenceDate: Date) {
  return `${referenceDate.getUTCFullYear() - ageYears}-01-01`;
}

function isYes(answer: FamilyQuestionAnswerInput | undefined) {
  return answer?.kind === "yes_no" && answer.value === "yes";
}

function isNo(answer: FamilyQuestionAnswerInput | undefined) {
  return answer?.kind === "yes_no" && answer.value === "no";
}

function isAmbiguous(answer: FamilyQuestionAnswerInput | undefined) {
  return (
    answer?.kind === "yes_no" &&
    (answer.value === "unclear" || answer.value === "declined")
  );
}

function yesOrAmbiguous(answer: FamilyQuestionAnswerInput | undefined) {
  return isYes(answer) || isAmbiguous(answer);
}

function openTextValue(answer: FamilyQuestionAnswerInput | undefined) {
  if (answer?.kind !== "open_text") {
    return "";
  }
  return answer.value.trim();
}

function textLooksPositive(value: string) {
  if (!value || value.trim().length === 0) {
    return false;
  }
  const normalized = normalizeText(value);
  if (/^(no|none|n\/a|na|nothing)$/.test(normalized)) {
    return false;
  }
  return true;
}

function addScore(scores: FamilyScoreMap, family: NormalizedSymptomFamily, points: number) {
  scores[family] = clamp(scores[family] + points, 0, 4);
}

function deriveSymptomScores(answers: Map<string, FamilyQuestionAnswerInput>) {
  const scores: FamilyScoreMap = { ...EMPTY_FAMILY_SCORES };

  const mapYesQuestions: Array<[string, NormalizedSymptomFamily, number]> = [
    ["5B.1", "mood_depression_irritability", 1],
    ["5B.2", "mood_depression_irritability", 1],
    ["5B.3", "mood_depression_irritability", 1],
    ["5C.1", "anxiety_worry_panic_ocd", 1],
    ["5C.2", "anxiety_worry_panic_ocd", 1],
    ["5C.3", "anxiety_worry_panic_ocd", 1],
    ["5C.4", "anxiety_worry_panic_ocd", 1],
    ["5D.1", "attention_hyperactivity_impulsivity", 1],
    ["5D.2", "attention_hyperactivity_impulsivity", 1],
    ["5D.3", "attention_hyperactivity_impulsivity", 1],
    ["5D.4", "attention_hyperactivity_impulsivity", 0.8],
    ["5E.1", "behavioral_dysregulation_defiance_aggression", 1],
    ["5E.2", "behavioral_dysregulation_defiance_aggression", 1],
    ["5E.3", "behavioral_dysregulation_defiance_aggression", 1],
    ["5F.1", "conduct_type_behaviors", 1],
    ["5F.2", "conduct_type_behaviors", 1.2],
    ["5F.3", "conduct_type_behaviors", 1],
    ["5F.4", "conduct_type_behaviors", 1],
    ["5G.1", "trauma_stress_related", 1],
    ["5G.2", "trauma_stress_related", 1],
    ["5G.3", "trauma_stress_related", 1],
    ["5H.1", "eating_body_image", 1],
    ["5H.2", "eating_body_image", 1],
    ["5H.3", "eating_body_image", 1],
    ["5I.2", "substance_use", 1],
    ["5J.1", "psychosis_mania_like", 1],
    ["5J.2", "psychosis_mania_like", 1],
    ["5J.3", "psychosis_mania_like", 1],
  ];

  for (const [questionId, family, points] of mapYesQuestions) {
    if (yesOrAmbiguous(answers.get(questionId))) {
      addScore(scores, family, points);
    }
  }

  const textBasedQuestions = ["5.0", "5A.1", "5A.2", "5B.4", "5C.5", "5G.4"];
  for (const questionId of textBasedQuestions) {
    const text = openTextValue(answers.get(questionId));
    if (!textLooksPositive(text)) {
      continue;
    }
    const normalizedFamily = normalizeSymptomFamily(text);
    if (normalizedFamily !== "mixed_unclear") {
      addScore(scores, normalizedFamily, 0.7);
    } else {
      addScore(scores, "mixed_unclear", 0.6);
    }
  }

  const substanceText = openTextValue(answers.get("5I.1"));
  if (
    textLooksPositive(substanceText) &&
    /\b(alcohol|cannabis|weed|drug|vape|nicotine|opioid|substance)\b/.test(
      normalizeText(substanceText),
    )
  ) {
    addScore(scores, "substance_use", 1);
  }

  return scores;
}

function derivePrimaryAndSecondary(scores: FamilyScoreMap) {
  const ranked = (Object.entries(scores) as Array<[NormalizedSymptomFamily, number]>)
    .filter(([family, score]) => family !== "mixed_unclear" && score >= 1.25)
    .sort((a, b) => b[1] - a[1]);

  const top = ranked[0];
  const second = ranked[1];
  const tie = Boolean(top && second && top[1] - second[1] <= 0.5);
  const insufficientData = !top || top[1] < 1.7;
  const mixedSignals = tie || scores.mixed_unclear >= 1.2;
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
    secondaryFamilies: ranked
      .slice(1, 5)
      .filter((entry) => entry[1] >= 1.6)
      .map(([family]) => toLabel(family)),
    isMixedUnclear: false,
    insufficientData: false,
    mixedSignals,
  };
}

function hasWord(text: string, pattern: RegExp) {
  return pattern.test(normalizeText(text));
}

function buildAnswerMap(responses: FamilyQuestionResponseInput[]) {
  const map = new Map<string, FamilyQuestionAnswerInput>();
  for (const response of responses) {
    if (!map.has(response.questionId)) {
      map.set(response.questionId, response.answer);
    }
  }
  return map;
}

export function createFamilyRoutingOutputFromQuestionnaire(
  input: FamilyQuestionnaireSubmissionInput,
  referenceDate: Date = new Date(),
): FamilyRoutingOutput {
  const answers = buildAnswerMap(input.responses);
  const ageText = (() => {
    const answer = answers.get("2.1");
    if (answer?.kind === "date_or_age") {
      return answer.value;
    }
    if (answer?.kind === "open_text") {
      return answer.value;
    }
    return "";
  })();
  const ageYears = parseAgeYears(ageText, referenceDate) ?? 12;
  const patientDob = toDob(ageYears, referenceDate);

  const safetyQuestionIds = [
    "1B.1",
    "1B.2",
    "1B.3",
    "1B.4",
    "1C.1",
    "1C.2",
    "1C.3",
    "1D.1",
    "1D.2",
    "1D.3",
    "1D.4",
    "1E.1",
    "1E.2",
    "1E.3",
    "ASQ-1",
    "ASQ-2",
    "ASQ-3",
    "ASQ-4",
    "ASQ-5",
  ];

  const anySafetyPositive = safetyQuestionIds.some((id) =>
    yesOrAmbiguous(answers.get(id)),
  );

  const immediateSafety =
    yesOrAmbiguous(answers.get("1E.1")) ||
    yesOrAmbiguous(answers.get("1E.3")) ||
    yesOrAmbiguous(answers.get("ASQ-3")) ||
    yesOrAmbiguous(answers.get("ASQ-5")) ||
    isYes(answers.get("1B.3")) ||
    isYes(answers.get("1B.4"));

  const suicidalRisk =
    yesOrAmbiguous(answers.get("1B.1")) ||
    yesOrAmbiguous(answers.get("1B.2")) ||
    yesOrAmbiguous(answers.get("ASQ-1")) ||
    yesOrAmbiguous(answers.get("ASQ-2")) ||
    yesOrAmbiguous(answers.get("ASQ-3")) ||
    yesOrAmbiguous(answers.get("ASQ-4")) ||
    yesOrAmbiguous(answers.get("ASQ-5"));

  const violenceRisk =
    yesOrAmbiguous(answers.get("1C.1")) ||
    yesOrAmbiguous(answers.get("1C.2")) ||
    yesOrAmbiguous(answers.get("1C.3")) ||
    yesOrAmbiguous(answers.get("1E.1")) ||
    yesOrAmbiguous(answers.get("1E.3"));

  const psychosisRisk =
    yesOrAmbiguous(answers.get("1D.1")) ||
    yesOrAmbiguous(answers.get("1D.2")) ||
    yesOrAmbiguous(answers.get("1D.3")) ||
    yesOrAmbiguous(answers.get("1D.4"));

  const profileLimitedVerbal = isNo(answers.get("3.1")) || isYes(answers.get("3.2"));
  const profileNonverbal =
    profileLimitedVerbal &&
    hasWord(openTextValue(answers.get("3.5")), /\bnonverbal\b/);

  const communicationProfile = profileNonverbal
    ? "nonverbal"
    : profileLimitedVerbal
      ? "limited_verbal"
      : "verbal_typical";

  let neuroCriteria = 0;
  if (yesOrAmbiguous(answers.get("4.1"))) neuroCriteria += 1;
  if (yesOrAmbiguous(answers.get("4.2"))) neuroCriteria += 1;
  if (yesOrAmbiguous(answers.get("4.3"))) neuroCriteria += 1;
  if (yesOrAmbiguous(answers.get("4.4"))) neuroCriteria += 1;
  if (yesOrAmbiguous(answers.get("4.5"))) neuroCriteria += 1;
  if (answers.has("4.6") && (isNo(answers.get("4.6")) || isAmbiguous(answers.get("4.6")))) neuroCriteria += 1;
  if (answers.has("4.7") && (isNo(answers.get("4.7")) || isAmbiguous(answers.get("4.7")))) neuroCriteria += 1;

  const developmentalConcern = yesOrAmbiguous(answers.get("3.3"));
  const autismConcern = yesOrAmbiguous(answers.get("3.4")) || neuroCriteria >= 2;

  const familyScores = deriveSymptomScores(answers);
  if (autismConcern) {
    addScore(familyScores, "autism_developmental_social", 0.8);
  }
  const symptomSelection = derivePrimaryAndSecondary(familyScores);

  const homeScore = scoreFromSeverity(
    answers.get("6A.1")?.kind === "mild_mod_severe"
      ? answers.get("6A.1")?.value
      : null,
  );
  const schoolScore = scoreFromSeverity(
    answers.get("6B.1")?.kind === "mild_mod_severe"
      ? answers.get("6B.1")?.value
      : answers.get("6B.3")?.kind === "mild_mod_severe"
        ? answers.get("6B.3")?.value
        : null,
  );
  const peerScore = scoreFromSeverity(
    answers.get("6C.1")?.kind === "mild_mod_severe"
      ? answers.get("6C.1")?.value
      : null,
  );
  const safetyLegalScore = scoreFromSeverity(
    answers.get("6D.1")?.kind === "mild_mod_severe"
      ? answers.get("6D.1")?.value
      : null,
  );

  const presentingNarrative = [
    openTextValue(answers.get("5.0")),
    openTextValue(answers.get("5A.1")),
    openTextValue(answers.get("5A.2")),
  ]
    .join(" ")
    .trim();
  const rapidWorsening = hasWord(
    presentingNarrative,
    /\b(rapid|sudden|worsen|worsening|last week|past week)\b/,
  );

  const rulesInput: RulesInput = {
    patientDob,
    respondentType: "caregiver",
    communicationProfile,
    developmentalDelayConcern: developmentalConcern,
    autismConcern,
    safetyAssessment: {
      suicidalRiskFlag: suicidalRisk,
      violenceRiskFlag: violenceRisk,
      psychosisManiaFlag: psychosisRisk,
      requiresImmediateReview: anySafetyPositive,
      escalationLevel: immediateSafety ? "immediate" : anySafetyPositive ? "urgent" : "none",
      detailFlags: {
        immediateDangerNow: immediateSafety,
        suicidalPlanOrIntent: yesOrAmbiguous(answers.get("ASQ-3")),
        suicideAttemptPast3Months:
          isYes(answers.get("1B.3")) || isYes(answers.get("1B.4")) || isYes(answers.get("ASQ-4")),
        violentPlan: yesOrAmbiguous(answers.get("1C.1")) || yesOrAmbiguous(answers.get("1C.2")),
        violentTarget: yesOrAmbiguous(answers.get("1C.3")),
        fireSetting: yesOrAmbiguous(answers.get("1E.2")),
        weaponUseOrAccessForHarm: yesOrAmbiguous(answers.get("1E.3")),
        severePsychosisManiaDisorganization: psychosisRisk,
      },
    },
    symptomAssessment: {
      primaryFamily: symptomSelection.primaryFamily,
      secondaryFamilies: symptomSelection.secondaryFamilies,
      isMixedUnclear: symptomSelection.isMixedUnclear,
      familyScores,
      mostImpairingConcern: symptomSelection.primaryFamily,
      insufficientData: symptomSelection.insufficientData,
      mixedSignals: symptomSelection.mixedSignals,
      conductRedFlags: {
        cruelty: yesOrAmbiguous(answers.get("5F.2")),
        fireSetting: yesOrAmbiguous(answers.get("1E.2")),
        weaponIncident: yesOrAmbiguous(answers.get("1E.3")),
        seriousViolenceHistory: yesOrAmbiguous(answers.get("5F.3")),
      },
    },
    functionalImpact: {
      homeScore: homeScore ?? (anySafetyPositive ? 6 : 2),
      schoolScore: schoolScore ?? 2,
      peerScore: peerScore ?? 2,
      safetyLegalScore: safetyLegalScore ?? (anySafetyPositive ? 7 : 2),
      rapidWorsening,
    },
  };

  const rulesResult = evaluateTriageRules(rulesInput);
  const recommendation = createFamilyRecommendationFromRulesResult(
    rulesResult,
    {
      preferredApproach: null,
      familyHistory: "unknown",
    },
    {
      neurodevelopmentalModifier: autismConcern,
      includePatientInstruments:
        isYes(answers.get("7.2")) ||
        rulesResult.ageBand === "adolescent" ||
        rulesResult.ageBand === "transitional_young_adult",
      teacherFormAvailable: isYes(answers.get("7.3"))
        ? true
        : isNo(answers.get("7.3"))
          ? false
          : null,
    },
  );

  return {
    rulesInput,
    rulesResult,
    specialistType: recommendation.specialistType,
    specialistDescription: recommendation.specialistDescription,
    rationale: recommendation.rationale,
    nextSteps: recommendation.nextSteps,
    instrumentPack: recommendation.instrumentPack,
  };
}
