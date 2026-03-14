export type RiskLevel = "low" | "moderate" | "high";
export type CaseStatus = "pending" | "in-review" | "completed" | "escalated";

export interface PatientCase {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  riskLevel: RiskLevel;
  primaryConcern: string;
  severityScore: number;
  status: CaseStatus;
  reviewer: string | null;
  respondent: string;
  flaggedAt?: string;
  alertType?: string;
  symptoms: string[];
  functionalImpact: {
    home: number;
    school: number;
    social: number;
    safety: number;
  };
  safetyFlags: {
    selfHarm: boolean;
    suicidalThoughts: boolean;
    harmToOthers: boolean;
  };
  summary: string;
  recommendation: string;
  createdAt: string;
}

export const mockCases: PatientCase[] = [
  {
    id: "CASE-001",
    patientName: "Emma Johnson",
    age: 14,
    gender: "Female",
    riskLevel: "moderate",
    primaryConcern: "Anxiety / Panic",
    severityScore: 72,
    status: "in-review",
    reviewer: "Dr. Sarah Chen",
    respondent: "Parent",
    symptoms: ["Anxiety / Panic", "Sleep Disturbance", "Social Withdrawal"],
    functionalImpact: { home: 5, school: 7, social: 8, safety: 2 },
    safetyFlags: { selfHarm: false, suicidalThoughts: false, harmToOthers: false },
    summary: "14-year-old female presenting with moderate anxiety symptoms significantly impacting school performance and social functioning. Parent reports increasing avoidance of social situations over past 3 months.",
    recommendation: "Mental health intake appointment suggested. Consider anxiety screening (GAD-7) and cognitive behavioral therapy referral.",
    createdAt: "2026-03-14T08:30:00Z",
  },
  {
    id: "CASE-002",
    patientName: "Lucas Rivera",
    age: 8,
    gender: "Male",
    riskLevel: "low",
    primaryConcern: "ADHD / Attention",
    severityScore: 45,
    status: "pending",
    reviewer: null,
    respondent: "Parent",
    symptoms: ["ADHD / Attention", "Behavioral Issues"],
    functionalImpact: { home: 4, school: 6, social: 3, safety: 0 },
    safetyFlags: { selfHarm: false, suicidalThoughts: false, harmToOthers: false },
    summary: "8-year-old male with attention difficulties primarily impacting school. Teacher reports difficulty sustaining attention and frequent fidgeting.",
    recommendation: "Follow up with pediatrician. Consider ADHD screening (Vanderbilt Assessment).",
    createdAt: "2026-03-13T14:15:00Z",
  },
  {
    id: "CASE-003",
    patientName: "Ava Chen",
    age: 16,
    gender: "Female",
    riskLevel: "high",
    primaryConcern: "Depression / Mood",
    severityScore: 89,
    status: "escalated",
    reviewer: "Dr. Michael Torres",
    respondent: "Self",
    flaggedAt: "2 hours ago",
    alertType: "Suicidal Ideation",
    symptoms: ["Depression / Mood", "Sleep Disturbance", "Social Withdrawal", "Self-Harm"],
    functionalImpact: { home: 8, school: 9, social: 9, safety: 7 },
    safetyFlags: { selfHarm: true, suicidalThoughts: true, harmToOthers: false },
    summary: "16-year-old female reporting severe depressive symptoms with active suicidal ideation. Safety screening positive for self-harm and suicidal thoughts. Significant functional impairment across all domains.",
    recommendation: "Urgent psychiatric evaluation recommended. Immediate safety planning required.",
    createdAt: "2026-03-14T06:00:00Z",
  },
  {
    id: "CASE-004",
    patientName: "Noah Williams",
    age: 11,
    gender: "Male",
    riskLevel: "moderate",
    primaryConcern: "Behavioral Issues",
    severityScore: 61,
    status: "in-review",
    reviewer: "Dr. Sarah Chen",
    respondent: "Parent",
    symptoms: ["Behavioral Issues", "ADHD / Attention", "Aggression"],
    functionalImpact: { home: 7, school: 6, social: 5, safety: 3 },
    safetyFlags: { selfHarm: false, suicidalThoughts: false, harmToOthers: false },
    summary: "11-year-old male with increasing behavioral difficulties at home and school. Parent reports oppositional behavior and difficulty managing anger.",
    recommendation: "Mental health intake appointment suggested. Consider behavioral assessment and family therapy referral.",
    createdAt: "2026-03-12T10:45:00Z",
  },
  {
    id: "CASE-005",
    patientName: "Sophia Martinez",
    age: 6,
    gender: "Female",
    riskLevel: "low",
    primaryConcern: "Developmental Concerns",
    severityScore: 38,
    status: "completed",
    reviewer: "Dr. Lisa Park",
    respondent: "Parent",
    symptoms: ["Developmental Concerns", "Social Withdrawal"],
    functionalImpact: { home: 3, school: 4, social: 5, safety: 0 },
    safetyFlags: { selfHarm: false, suicidalThoughts: false, harmToOthers: false },
    summary: "6-year-old female with concerns about social development and communication. Parent reports difficulty with peer interactions.",
    recommendation: "Developmental evaluation recommended. Consider speech-language assessment.",
    createdAt: "2026-03-11T09:00:00Z",
  },
];

export const dashboardStats = {
  urgentCases: 1,
  newReferrals: 3,
  awaitingReview: 2,
  completedToday: 1,
};

export const severityTimeline = [
  { date: "Week 1", score: 45 },
  { date: "Week 2", score: 52 },
  { date: "Week 3", score: 58 },
  { date: "Week 4", score: 65 },
  { date: "Week 5", score: 72 },
  { date: "Week 6", score: 78 },
  { date: "Week 7", score: 85 },
  { date: "Week 8", score: 89 },
];
