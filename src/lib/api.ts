export type AppRole =
  | "patient"
  | "caregiver"
  | "intake_coordinator"
  | "clinician"
  | "admin";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const PROVIDER_USER_ID = (import.meta.env.VITE_PROVIDER_USER_ID as string | undefined)?.trim() || "user-clin-001";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}, role: AppRole, userId?: string) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-role", role);
  if (userId) {
    headers.set("x-user-id", userId);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

export interface IntakeSessionCreateResponse {
  id: string;
  patientId: string;
  routeType: "patient_portal" | "provider_portal";
  status: string;
}

export interface IntakeSubmitResponse {
  submitted: true;
  status: string;
  submittedAt: string;
  decision?: {
    recommendation: string;
    requiresClinicianReview: boolean;
    urgencyLevel: string;
    engineVersion: string;
    pathwayKey: string;
    reasonCodes: string[];
  };
}

export interface ReviewQueueCase {
  sessionId: string;
  patientId: string;
  patientName: string;
  routeType: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  latestDecision: {
    recommendation: string;
    requiresClinicianReview: boolean;
    urgencyLevel: string;
    engineVersion: string;
    createdAt: string;
  } | null;
}

export interface ProviderCaseDetailResponse {
  session: {
    id: string;
    patientId: string;
    routeType: string;
    status: string;
    createdAt: string;
    submittedAt: string | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    sexAtBirth: string | null;
  };
  respondent: {
    type: string;
    relationshipToPatient: string | null;
  } | null;
  safetyAssessment: {
    suicidalRiskFlag: boolean;
    violenceRiskFlag: boolean;
    psychosisManiaFlag: boolean;
    escalationLevel: string;
    requiresImmediateReview: boolean;
  } | null;
  symptomAssessment: {
    primaryFamily: string;
    secondaryFamilies: string[];
    isMixedUnclear: boolean;
  } | null;
  functionalImpact: {
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
    overallSeverity: string;
  } | null;
  latestDecision: {
    recommendation: string;
    requiresClinicianReview: boolean;
    urgencyLevel: string;
    engineVersion: string;
    createdAt: string;
  } | null;
  clinicianReviews: Array<{
    id: string;
    reviewerUserId: string | null;
    overrideApplied: boolean;
    finalDisposition: string;
    rationale: string;
    reviewedAt: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    timestamp: string;
    metadataJson: unknown;
  }>;
}

export async function createIntakeSession(input: {
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    sexAtBirth?: "female" | "male" | "intersex" | "unknown";
  };
}) {
  return request<IntakeSessionCreateResponse>(
    "/api/v1/intake-sessions",
    {
      method: "POST",
      body: JSON.stringify({
        routeType: "patient_portal",
        ...input,
      }),
    },
    "caregiver",
  );
}

export async function saveRespondent(sessionId: string, type: "patient" | "caregiver" | "clinician") {
  return request<{ id: string }>(
    `/api/v1/intake-sessions/${sessionId}/respondent`,
    {
      method: "PATCH",
      body: JSON.stringify({
        type,
        relationshipToPatient: type === "caregiver" ? "caregiver" : undefined,
      }),
    },
    "caregiver",
  );
}

export async function saveSafety(
  sessionId: string,
  flags: { selfHarm: boolean; suicidal: boolean; harmOthers: boolean },
) {
  return request<{
    escalationLevel: string;
    requiresImmediateReview: boolean;
    autoRoutingSuspended: boolean;
    sessionStatus: string;
  }>(
    `/api/v1/intake-sessions/${sessionId}/safety`,
    {
      method: "PATCH",
      body: JSON.stringify({
        suicidalRiskFlag: flags.selfHarm || flags.suicidal,
        violenceRiskFlag: flags.harmOthers,
        psychosisManiaFlag: false,
      }),
    },
    "caregiver",
  );
}

export async function saveSymptoms(sessionId: string, symptomLabel: string, secondary: string[]) {
  return request<{ id: string }>(
    `/api/v1/intake-sessions/${sessionId}/symptoms`,
    {
      method: "PATCH",
      body: JSON.stringify({
        primaryFamily: symptomLabel,
        secondaryFamilies: secondary,
        isMixedUnclear: false,
      }),
    },
    "caregiver",
  );
}

export async function saveFunctionalImpact(
  sessionId: string,
  impact: { home: number; school: number; social: number; safety: number },
) {
  return request<{ id: string; overallSeverity: string }>(
    `/api/v1/intake-sessions/${sessionId}/functional-impact`,
    {
      method: "PATCH",
      body: JSON.stringify({
        homeScore: impact.home,
        schoolScore: impact.school,
        peerScore: impact.social,
        safetyLegalScore: impact.safety,
      }),
    },
    "caregiver",
  );
}

export async function submitIntakeSession(sessionId: string) {
  return request<IntakeSubmitResponse>(
    `/api/v1/intake-sessions/${sessionId}/submit`,
    {
      method: "POST",
    },
    "caregiver",
  );
}

export async function fetchReviewQueue(status: "all" | "awaiting_review" | "flagged_urgent" = "all") {
  return request<{
    status: string;
    count: number;
    cases: ReviewQueueCase[];
  }>(`/api/v1/provider/review-queue?status=${status}`, {}, "clinician", PROVIDER_USER_ID);
}

export async function fetchUrgentCases() {
  return request<{
    count: number;
    cases: Array<{
      sessionId: string;
      patientName: string;
      status: string;
      escalationLevel: string;
      createdAt: string;
    }>;
  }>("/api/v1/provider/urgent-cases", {}, "clinician", PROVIDER_USER_ID);
}

export async function fetchProviderCaseDetail(caseId: string) {
  return request<ProviderCaseDetailResponse>(
    `/api/v1/provider/cases/${caseId}`,
    {},
    "clinician",
    PROVIDER_USER_ID,
  );
}

export async function submitCaseOverride(caseId: string, input: { finalDisposition: string; rationale: string }) {
  return request<{
    review: {
      id: string;
      finalDisposition: string;
      rationale: string;
      overrideApplied: boolean;
      reviewerUserId: string | null;
    };
    sessionStatus: string;
  }>(
    `/api/v1/provider/cases/${caseId}/override`,
    {
      method: "POST",
      body: JSON.stringify({
        overrideApplied: true,
        finalDisposition: input.finalDisposition,
        rationale: input.rationale,
        finalizeSession: true,
      }),
    },
    "clinician",
    PROVIDER_USER_ID,
  );
}
