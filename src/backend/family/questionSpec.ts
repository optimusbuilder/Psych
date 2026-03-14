export type FamilyQuestionResponseType =
  | "ack"
  | "yes_no"
  | "yes_no_unclear"
  | "open_text"
  | "mild_mod_severe"
  | "date_or_age"
  | "confirm";

export type FamilyQuestionRater = "CG" | "PT" | "CG+PT";

export type FamilyQuestionAgeTarget =
  | "all"
  | "0-5"
  | "6-12"
  | "12+"
  | "13+"
  | "13-17"
  | "18-25"
  | "16-30m"
  | "school-age+";

export interface FamilyQuestionSpec {
  id: string;
  node: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  prompt: string;
  responseType: FamilyQuestionResponseType;
  raters: FamilyQuestionRater[];
  ageTargets: FamilyQuestionAgeTarget[];
  required: boolean;
  branch?: {
    askIfQuestionId: string;
    askIfValue: "yes";
  };
}

function q(def: FamilyQuestionSpec): FamilyQuestionSpec {
  return def;
}

export const FAMILY_QUESTION_SPEC_VERSION = "question-spec-v1";

export const FAMILY_QUESTION_SPECS: FamilyQuestionSpec[] = [
  q({
    id: "1A.1",
    node: 1,
    label: "Safety Introduction",
    prompt:
      "Before we begin, I will ask safety questions that are asked of every family. If anything feels urgent or unsafe, please tell us immediately.",
    responseType: "ack",
    raters: ["CG", "PT"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1B.1",
    node: 1,
    label: "Caregiver Self-Harm Concern",
    prompt:
      "Has your child had thoughts of self-harm, suicide, or recent self-injury?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1B.2",
    node: 1,
    label: "Patient Self-Harm Concern",
    prompt:
      "Have you had thoughts of self-harm, suicide, or recent self-injury?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "1B.3",
    node: 1,
    label: "Caregiver Attempt History",
    prompt:
      "Has your child ever attempted to hurt themselves or take their own life?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1B.4",
    node: 1,
    label: "Patient Attempt History",
    prompt: "Have you ever tried to hurt yourself or take your own life?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "1C.1",
    node: 1,
    label: "Caregiver Harm-to-Others Concern",
    prompt:
      "Has your child expressed thoughts about hurting someone else or made threats?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1C.2",
    node: 1,
    label: "Patient Harm-to-Others Concern",
    prompt:
      "Have you had thoughts about hurting someone else or made threats toward someone?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "1C.3",
    node: 1,
    label: "Specific Target Concern",
    prompt:
      "Has your child identified a specific person they threatened or intended to harm?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1D.1",
    node: 1,
    label: "Hallucination Concern (Caregiver)",
    prompt:
      "Have you noticed your child hearing or seeing things others could not?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1D.2",
    node: 1,
    label: "Delusional Belief Concern",
    prompt:
      "Has your child expressed unusual beliefs that seem out of touch with reality?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1D.3",
    node: 1,
    label: "Hallucination Concern (Patient)",
    prompt:
      "Have you heard or seen things that others around you did not notice?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "1D.4",
    node: 1,
    label: "Disorganized Speech Concern",
    prompt:
      "Have there been episodes where speech was disorganized or hard to follow?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1E.1",
    node: 1,
    label: "Severe Aggression or Weapon Episode",
    prompt:
      "Has your child had serious physical aggression, severe property destruction, fire-setting, or weapon use?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1E.2",
    node: 1,
    label: "Fire-Setting Concern",
    prompt:
      "Has your child intentionally set a fire or threatened to do so?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "1E.3",
    node: 1,
    label: "Weapon Access or Threat",
    prompt:
      "Has your child used or had access to a weapon in a threatening or violent way?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "ASQ-1",
    node: 1,
    label: "ASQ 1",
    prompt: "In the past few weeks, have you wished you were dead?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "ASQ-2",
    node: 1,
    label: "ASQ 2",
    prompt:
      "In the past few weeks, have you felt you or your family would be better off if you were dead?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "ASQ-3",
    node: 1,
    label: "ASQ 3",
    prompt: "In the past week, have you been having thoughts of killing yourself?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "ASQ-4",
    node: 1,
    label: "ASQ 4",
    prompt: "Have you ever tried to kill yourself?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "ASQ-5",
    node: 1,
    label: "ASQ 5",
    prompt: "Are you having thoughts of killing yourself right now?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
    branch: {
      askIfQuestionId: "ASQ-4",
      askIfValue: "yes",
    },
  }),
  q({
    id: "2.1",
    node: 2,
    label: "Age Confirmation",
    prompt:
      "Please provide date of birth (YYYY-MM-DD) or current age in years.",
    responseType: "date_or_age",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "2.2",
    node: 2,
    label: "Caregiver Collateral (18-25)",
    prompt:
      "If patient is 18-25, is a caregiver available for additional collateral information?",
    responseType: "yes_no",
    raters: ["PT"],
    ageTargets: ["18-25"],
    required: false,
  }),
  q({
    id: "3.1",
    node: 3,
    label: "Age-Typical Communication",
    prompt:
      "Is the patient able to communicate verbally and understand questions at an age-typical level?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "3.2",
    node: 3,
    label: "Nonverbal / Limited Verbal Concern",
    prompt:
      "Are there concerns that the patient communicates primarily through nonverbal means?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "3.3",
    node: 3,
    label: "Developmental or Learning Diagnosis",
    prompt:
      "Has the patient been diagnosed with developmental delay, intellectual disability, or learning disability?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "3.4",
    node: 3,
    label: "Known or Suspected Autism",
    prompt:
      "Has the patient been diagnosed with autism, or are there current concerns about autism?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "3.5",
    node: 3,
    label: "Patient Communication Self-Assessment",
    prompt:
      "How comfortable is the patient answering questions independently?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "4.1",
    node: 4,
    label: "Sensory Reactivity",
    prompt:
      "Are there unusual sensory sensitivities or strong sensory-seeking behaviors?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "4.2",
    node: 4,
    label: "Transition Distress",
    prompt:
      "Does the patient become significantly distressed by routine changes or transitions?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "4.3",
    node: 4,
    label: "Repetitive Behaviors",
    prompt:
      "Are there repetitive movements, sounds, or repeated phrases/behaviors?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "4.4",
    node: 4,
    label: "Restricted Interests",
    prompt:
      "Are there unusually intense or narrow interests compared with peers?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "4.5",
    node: 4,
    label: "Social Communication Concern",
    prompt:
      "Are there concerns with eye contact, back-and-forth conversation, social cues, or peer relating?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "4.6",
    node: 4,
    label: "Joint Attention (Toddler)",
    prompt:
      "For toddlers: does the child point to show interest (not only to request)?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["16-30m"],
    required: false,
  }),
  q({
    id: "4.7",
    node: 4,
    label: "Point Following (Toddler)",
    prompt:
      "For toddlers: does the child look when you point across the room?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["16-30m"],
    required: false,
  }),
  q({
    id: "5.0",
    node: 5,
    label: "Primary Presenting Concern",
    prompt:
      "What is the main concern that brought you for this evaluation?",
    responseType: "open_text",
    raters: ["CG"],
    ageTargets: ["all"],
    required: false,
  }),
  q({
    id: "5A.1",
    node: 5,
    label: "Presenting Concern (Caregiver)",
    prompt:
      "In your own words, what is the main concern today?",
    responseType: "open_text",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5A.2",
    node: 5,
    label: "Presenting Concern (Patient)",
    prompt:
      "In your own words, what has been most difficult lately?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5B.1",
    node: 5,
    label: "Persistent Sadness/Hopelessness",
    prompt:
      "Has there been persistent sadness, emptiness, or hopelessness for more than two weeks?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5B.2",
    node: 5,
    label: "Persistent Irritability",
    prompt: "Is the patient unusually irritable most days versus baseline?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5B.3",
    node: 5,
    label: "Loss of Interest",
    prompt: "Has the patient lost interest in previously enjoyable activities?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5B.4",
    node: 5,
    label: "Mood Description (Patient)",
    prompt:
      "Over the past two weeks, how has your mood been most of the time?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5C.1",
    node: 5,
    label: "Excessive Worry",
    prompt:
      "Does the patient experience excessive hard-to-control worry that interferes with daily life?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5C.2",
    node: 5,
    label: "Anxiety Physical Symptoms",
    prompt:
      "Are there physical anxiety symptoms (e.g., stomachaches, headaches, racing heart)?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5C.3",
    node: 5,
    label: "Avoidance / School Refusal",
    prompt:
      "Does the patient avoid situations (including school) due to fear or anxiety?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5C.4",
    node: 5,
    label: "Compulsions / Intrusive Thoughts",
    prompt:
      "Are there repetitive rituals, compulsions, or intrusive thoughts causing distress?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5C.5",
    node: 5,
    label: "Worry Description (Patient)",
    prompt: "Do worries feel excessive and hard to control?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5D.1",
    node: 5,
    label: "Attention Concerns",
    prompt:
      "Are there concerns with sustained attention and following through on tasks?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5D.2",
    node: 5,
    label: "Hyperactivity Concerns",
    prompt:
      "Is the patient frequently overactive or restless when calm sitting is expected?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5D.3",
    node: 5,
    label: "Impulsivity Concerns",
    prompt:
      "Does the patient act before thinking, interrupt, or struggle to wait turn?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5D.4",
    node: 5,
    label: "Cross-Setting ADHD Evidence",
    prompt:
      "Have teachers reported similar attention/hyperactivity/impulsivity concerns at school?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["school-age+"],
    required: false,
  }),
  q({
    id: "5E.1",
    node: 5,
    label: "Explosive Outbursts",
    prompt:
      "Are there frequent explosive outbursts out of proportion to the situation?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5E.2",
    node: 5,
    label: "Defiance",
    prompt:
      "Does the patient frequently argue with or refuse requests from adults/authority figures?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5E.3",
    node: 5,
    label: "Physical Aggression",
    prompt:
      "Has there been physical aggression toward family, peers, or others?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5F.1",
    node: 5,
    label: "Lying/Stealing Pattern",
    prompt:
      "Has there been persistent lying or stealing causing significant problems?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5F.2",
    node: 5,
    label: "Cruelty Concern",
    prompt: "Has there been cruelty toward animals or other people?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5F.3",
    node: 5,
    label: "Justice System Involvement",
    prompt:
      "Has there been any law enforcement or juvenile justice system involvement?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5F.4",
    node: 5,
    label: "Property Destruction",
    prompt:
      "Has there been intentional destruction of property or damage to others' belongings?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5G.1",
    node: 5,
    label: "Trauma Exposure",
    prompt:
      "Has the patient experienced or witnessed something traumatic, frightening, or overwhelming?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5G.2",
    node: 5,
    label: "Trauma Re-Experiencing",
    prompt:
      "Are there nightmares, flashbacks, or signs of re-experiencing a frightening event?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5G.3",
    node: 5,
    label: "Trauma Avoidance",
    prompt:
      "Does the patient avoid people, places, or activities that remind them of upsetting events?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5G.4",
    node: 5,
    label: "Trauma Narrative (Patient)",
    prompt:
      "Has anything happened that still feels very upsetting or intrusive?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5H.1",
    node: 5,
    label: "Eating Restriction Concern",
    prompt:
      "Are there concerns with eating, food restriction, refusing food, or significant weight changes?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5H.2",
    node: 5,
    label: "Binge/Purge/Compensatory Behaviors",
    prompt:
      "Has there been binge eating, purging, excessive exercise, or laxative misuse?",
    responseType: "yes_no_unclear",
    raters: ["CG", "PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5H.3",
    node: 5,
    label: "Body Image Preoccupation",
    prompt:
      "Is there persistent preoccupation with weight, shape, or body image beyond peer norms?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "5I.1",
    node: 5,
    label: "Substance Use (Patient)",
    prompt:
      "Has the patient used alcohol, cannabis, or other substances? If yes, how often and with what impact?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["12+"],
    required: false,
  }),
  q({
    id: "5I.2",
    node: 5,
    label: "Substance Use (Caregiver Concern)",
    prompt:
      "Have you noticed or suspected alcohol/drug/substance use?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5J.1",
    node: 5,
    label: "Elevated Mood Episode",
    prompt:
      "Have there been episodes of unusually elevated/high mood lasting days and very different from baseline?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5J.2",
    node: 5,
    label: "Decreased Need for Sleep + High Energy",
    prompt:
      "Have there been periods of much less sleep with very high energy/activity and little fatigue?",
    responseType: "yes_no_unclear",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "5J.3",
    node: 5,
    label: "Mania-Like Period (Patient)",
    prompt:
      "Have you had periods of several days with unusually high energy, much less sleep, and racing thoughts?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "6A.1",
    node: 6,
    label: "Home Functioning Severity",
    prompt:
      "How much are current mental health concerns affecting home and family functioning?",
    responseType: "mild_mod_severe",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "6A.2",
    node: 6,
    label: "Home Functioning Narrative (Patient)",
    prompt: "How have things been at home from the patient's perspective?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "6B.1",
    node: 6,
    label: "School Functioning Severity",
    prompt:
      "How much are current concerns affecting school/work performance and attendance?",
    responseType: "mild_mod_severe",
    raters: ["CG"],
    ageTargets: ["school-age+"],
    required: false,
  }),
  q({
    id: "6B.2",
    node: 6,
    label: "School Functioning Narrative (Patient)",
    prompt:
      "How have current concerns affected school attendance, coursework, or performance?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["school-age+"],
    required: false,
  }),
  q({
    id: "6B.3",
    node: 6,
    label: "Work/School Functioning (18-25)",
    prompt:
      "How have current concerns affected work, school, or daily responsibilities?",
    responseType: "mild_mod_severe",
    raters: ["PT"],
    ageTargets: ["18-25"],
    required: false,
  }),
  q({
    id: "6C.1",
    node: 6,
    label: "Peer/Social Functioning Severity",
    prompt:
      "How much are current concerns affecting friendships, social interactions, or peer activities?",
    responseType: "mild_mod_severe",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "6C.2",
    node: 6,
    label: "Peer/Social Narrative (Patient)",
    prompt:
      "How have friendships or social life changed recently?",
    responseType: "open_text",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "6D.1",
    node: 6,
    label: "Safety/Legal Severity",
    prompt:
      "Beyond earlier questions, are there current safety or legal concerns that increase risk?",
    responseType: "mild_mod_severe",
    raters: ["CG"],
    ageTargets: ["all"],
    required: true,
  }),
  q({
    id: "6D.2",
    node: 6,
    label: "Additional Safety Disclosure (Patient)",
    prompt:
      "Is there anything else related to safety for self or others that should be shared now?",
    responseType: "yes_no_unclear",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "7.1",
    node: 7,
    label: "Caregiver Instrument Consent",
    prompt:
      "Do you understand and consent to pre-visit screening questionnaires?",
    responseType: "yes_no",
    raters: ["CG"],
    ageTargets: ["all"],
    required: false,
  }),
  q({
    id: "7.2",
    node: 7,
    label: "Patient Instrument Consent",
    prompt:
      "Does the patient consent to complete self-report questionnaires?",
    responseType: "yes_no",
    raters: ["PT"],
    ageTargets: ["13+"],
    required: false,
  }),
  q({
    id: "7.3",
    node: 7,
    label: "Teacher Form Availability",
    prompt:
      "For ADHD concerns, can a teacher form be arranged?",
    responseType: "yes_no",
    raters: ["CG"],
    ageTargets: ["school-age+"],
    required: false,
  }),
  q({
    id: "7.4",
    node: 7,
    label: "Instrument Plan Confirmation",
    prompt: "Do you have any questions about the recommended pre-visit screening plan?",
    responseType: "confirm",
    raters: ["CG", "PT"],
    ageTargets: ["all"],
    required: false,
  }),
];

export function getQuestionSpecById(questionId: string) {
  return FAMILY_QUESTION_SPECS.find((item) => item.id === questionId) ?? null;
}
