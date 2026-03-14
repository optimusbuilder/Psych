export type SymptomFamilyId =
  | "depression"
  | "anxiety"
  | "adhd"
  | "behavioral"
  | "conduct"
  | "social"
  | "trauma"
  | "eating"
  | "substance"
  | "psychosis";

export interface SymptomQuestion {
  id: string;
  label: string;
}

export interface SymptomFamilyOption {
  id: SymptomFamilyId;
  label: string;
  apiLabel: string;
}

export const symptomFamilyOptions: SymptomFamilyOption[] = [
  {
    id: "anxiety",
    label: "Anxiety / Panic",
    apiLabel: "Anxiety / Worry / Panic / School Refusal / OCD-like",
  },
  {
    id: "depression",
    label: "Depression / Mood",
    apiLabel: "Mood / Depression / Irritability",
  },
  {
    id: "adhd",
    label: "ADHD / Attention",
    apiLabel: "Attention / Hyperactivity / Impulsivity",
  },
  {
    id: "behavioral",
    label: "Behavioral Dysregulation",
    apiLabel: "Behavioral Dysregulation / Defiance / Aggression",
  },
  {
    id: "conduct",
    label: "Conduct-Type Behaviors",
    apiLabel: "Conduct-Type Behaviors",
  },
  {
    id: "social",
    label: "Social / Developmental",
    apiLabel: "Autism / Developmental / Social Concern",
  },
  {
    id: "trauma",
    label: "Trauma / Stress",
    apiLabel: "Trauma / Stress-Related Symptoms",
  },
  {
    id: "eating",
    label: "Eating / Body Image",
    apiLabel: "Eating / Body Image Concerns",
  },
  {
    id: "substance",
    label: "Substance Use",
    apiLabel: "Substance Use",
  },
  {
    id: "psychosis",
    label: "Psychosis / Mania",
    apiLabel: "Psychosis / Mania-Like Symptoms",
  },
];

export const symptomDetailQuestions: Record<SymptomFamilyId, SymptomQuestion[]> = {
  depression: [
    { id: "lowMood", label: "Low mood, sadness, or irritability most days" },
    { id: "anhedonia", label: "Less interest or pleasure in usual activities" },
    { id: "hopeless", label: "Hopelessness, guilt, or worthlessness" },
  ],
  anxiety: [
    { id: "uncontrolledWorry", label: "Worry that feels hard to control" },
    { id: "panicPhysical", label: "Physical anxiety or panic symptoms" },
    { id: "avoidance", label: "Avoiding school, social, or daily activities due to fear" },
  ],
  adhd: [
    { id: "inattention", label: "Trouble sustaining attention" },
    { id: "disorganization", label: "Disorganization or forgetting tasks/materials" },
    { id: "impulsivity", label: "Fidgeting, interrupting, or impulsive actions" },
  ],
  behavioral: [
    { id: "outbursts", label: "Explosive outbursts or emotional dysregulation" },
    { id: "defiance", label: "Defiance/noncompliance with adult directions" },
    { id: "verbalAggression", label: "Verbal aggression toward others" },
  ],
  conduct: [
    { id: "lyingStealing", label: "Repeated lying or stealing" },
    { id: "propertyDamage", label: "Serious property destruction or vandalism" },
    { id: "legalProblems", label: "Legal/school discipline concerns linked to behavior" },
  ],
  social: [
    { id: "socialReciprocity", label: "Social communication/reciprocity difficulties" },
    { id: "rigidity", label: "Strong rigidity or distress with transitions" },
    { id: "sensory", label: "Sensory sensitivities or sensory-seeking behavior" },
  ],
  trauma: [
    { id: "intrusions", label: "Intrusive memories, nightmares, or re-experiencing" },
    { id: "hypervigilance", label: "Hypervigilance/startle or persistent threat response" },
    { id: "avoidance", label: "Avoiding reminders or trauma-linked places/people" },
  ],
  eating: [
    { id: "restriction", label: "Restrictive eating or fear of weight gain" },
    { id: "compensatory", label: "Compensatory behaviors (purging/laxatives/excess exercise)" },
    { id: "bodyPreoccupation", label: "Body image preoccupation causing distress" },
  ],
  substance: [
    { id: "useFrequency", label: "Alcohol/drug use in past month" },
    { id: "control", label: "Trouble controlling use or cutting down" },
    { id: "consequences", label: "School/home/legal issues related to use" },
  ],
  psychosis: [
    { id: "hallucinations", label: "Hallucinations or unusual perceptions" },
    { id: "delusions", label: "Fixed unusual beliefs/paranoia" },
    { id: "maniaActivation", label: "High energy with minimal sleep/risky behavior" },
  ],
};

export type FrequencyValue = 0 | 1 | 2 | 3 | 4;

export interface FrequencyOption {
  value: FrequencyValue;
  label: string;
}

export const frequencyOptions: FrequencyOption[] = [
  { value: 0, label: "Never" },
  { value: 1, label: "Rarely" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Often" },
  { value: 4, label: "Nearly daily" },
];

export type SymptomDetailResponses = Record<SymptomFamilyId, Record<string, FrequencyValue | null>>;

export function createEmptySymptomDetailResponses(): SymptomDetailResponses {
  const entries = symptomFamilyOptions.map((family) => {
    const questions = symptomDetailQuestions[family.id];
    const responseSet: Record<string, FrequencyValue | null> = {};
    for (const question of questions) {
      responseSet[question.id] = null;
    }
    return [family.id, responseSet] as const;
  });
  return Object.fromEntries(entries) as SymptomDetailResponses;
}

export function symptomDetailsComplete(
  selectedFamilies: string[],
  responses: SymptomDetailResponses,
) {
  if (selectedFamilies.length === 0) {
    return false;
  }
  for (const family of selectedFamilies) {
    const typedFamily = family as SymptomFamilyId;
    const familyResponses = responses[typedFamily];
    if (!familyResponses) {
      return false;
    }
    if (Object.values(familyResponses).some((value) => value === null)) {
      return false;
    }
  }
  return true;
}

export interface SymptomRoutingResult {
  primaryFamilyLabel: string;
  secondaryFamilyLabels: string[];
  isMixedUnclear: boolean;
}

function scoreFamily(id: SymptomFamilyId, responses: SymptomDetailResponses) {
  const values = Object.values(responses[id]).filter(
    (value): value is FrequencyValue => value !== null,
  );
  return values.reduce((sum, value) => sum + value, 0);
}

export function deriveSymptomRouting(
  selectedFamilies: string[],
  responses: SymptomDetailResponses,
): SymptomRoutingResult {
  const typedSelected = selectedFamilies.filter((id): id is SymptomFamilyId =>
    symptomFamilyOptions.some((family) => family.id === id),
  );

  if (typedSelected.length === 0) {
    return {
      primaryFamilyLabel: "Mixed / Unclear",
      secondaryFamilyLabels: [],
      isMixedUnclear: true,
    };
  }

  const scored = typedSelected
    .map((id) => ({ id, score: scoreFamily(id, responses) }))
    .sort((a, b) => b.score - a.score);

  const primary = scored[0];
  const secondary = scored.slice(1);
  const isMixedUnclear =
    scored.length > 1 && Math.abs((scored[0]?.score ?? 0) - (scored[1]?.score ?? 0)) <= 1;

  const primaryFamilyLabel =
    symptomFamilyOptions.find((family) => family.id === primary.id)?.apiLabel ?? "Mixed / Unclear";
  const secondaryFamilyLabels = secondary
    .map((item) => symptomFamilyOptions.find((family) => family.id === item.id)?.apiLabel)
    .filter((value): value is string => Boolean(value));

  return {
    primaryFamilyLabel,
    secondaryFamilyLabels,
    isMixedUnclear,
  };
}

export interface SafetyDetailFlags {
  suicidalThoughts: boolean;
  suicidalPlanOrIntent: boolean;
  recentSelfHarmOrAttempt: boolean;
  homicidalThoughtsOrThreat: boolean;
  violentPlanOrTarget: boolean;
  psychosisOrManiaSigns: boolean;
  severeAggressionFireSettingWeapon: boolean;
  severeIntoxicationOrWithdrawal: boolean;
  abuseOrNeglectConcern: boolean;
}

export function createEmptySafetyDetailFlags(): SafetyDetailFlags {
  return {
    suicidalThoughts: false,
    suicidalPlanOrIntent: false,
    recentSelfHarmOrAttempt: false,
    homicidalThoughtsOrThreat: false,
    violentPlanOrTarget: false,
    psychosisOrManiaSigns: false,
    severeAggressionFireSettingWeapon: false,
    severeIntoxicationOrWithdrawal: false,
    abuseOrNeglectConcern: false,
  };
}

export interface DerivedSafetySubmission {
  selfHarm: boolean;
  suicidal: boolean;
  harmOthers: boolean;
  psychosisMania: boolean;
  notes: string;
}

export function deriveSafetySubmission(flags: SafetyDetailFlags): DerivedSafetySubmission {
  const suicidal = flags.suicidalThoughts || flags.suicidalPlanOrIntent;
  const selfHarm = flags.recentSelfHarmOrAttempt || flags.suicidalThoughts;
  const harmOthers =
    flags.homicidalThoughtsOrThreat ||
    flags.violentPlanOrTarget ||
    flags.severeAggressionFireSettingWeapon;
  const psychosisMania = flags.psychosisOrManiaSigns;

  const noteReasons: string[] = [];
  if (flags.severeIntoxicationOrWithdrawal) {
    noteReasons.push("Severe intoxication/withdrawal concern");
  }
  if (flags.abuseOrNeglectConcern) {
    noteReasons.push("Abuse/neglect safeguarding concern");
  }
  if (flags.severeAggressionFireSettingWeapon) {
    noteReasons.push("Severe aggression/fire-setting/weapon concern");
  }
  if (flags.violentPlanOrTarget) {
    noteReasons.push("Violent plan/identified target concern");
  }
  if (flags.suicidalPlanOrIntent) {
    noteReasons.push("Suicidal plan or intent concern");
  }

  return {
    selfHarm,
    suicidal,
    harmOthers,
    psychosisMania,
    notes:
      noteReasons.length > 0
        ? `Detailed safety concerns: ${noteReasons.join("; ")}.`
        : "No additional high-risk safety qualifiers reported in detailed screen.",
  };
}

export interface FunctionalDomainQuestions {
  routineDisruption: FrequencyValue | null;
  conflictOrConsequence: FrequencyValue | null;
  baselineFunctionDrop: FrequencyValue | null;
}

export interface FunctionalDetailResponses {
  home: FunctionalDomainQuestions;
  school: FunctionalDomainQuestions;
  social: FunctionalDomainQuestions;
  safety: FunctionalDomainQuestions;
}

function emptyDomain(): FunctionalDomainQuestions {
  return {
    routineDisruption: null,
    conflictOrConsequence: null,
    baselineFunctionDrop: null,
  };
}

export function createEmptyFunctionalDetailResponses(): FunctionalDetailResponses {
  return {
    home: emptyDomain(),
    school: emptyDomain(),
    social: emptyDomain(),
    safety: emptyDomain(),
  };
}

export function functionalDetailsComplete(responses: FunctionalDetailResponses) {
  return Object.values(responses).every((domain) =>
    Object.values(domain).every((value) => value !== null),
  );
}

function scoreDomain(domain: FunctionalDomainQuestions) {
  const values = Object.values(domain).filter(
    (value): value is FrequencyValue => value !== null,
  );
  if (values.length === 0) {
    return 0;
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round((average / 4) * 10);
}

export interface FunctionalImpactScores {
  home: number;
  school: number;
  social: number;
  safety: number;
}

export function deriveFunctionalImpactScores(
  detailResponses: FunctionalDetailResponses,
): FunctionalImpactScores {
  return {
    home: scoreDomain(detailResponses.home),
    school: scoreDomain(detailResponses.school),
    social: scoreDomain(detailResponses.social),
    safety: scoreDomain(detailResponses.safety),
  };
}
