"use client"

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API request failed (${status})`)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

function buildUrl(path: string) {
  if (API_BASE.length === 0) {
    return path
  }
  return `${API_BASE}${path}`
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json")
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  })

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/pdf")) {
    if (!response.ok) {
      throw new ApiError(response.status, null)
    }
    return (await response.blob()) as T
  }

  const raw = await response.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = { message: raw }
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }
  return body as T
}

export interface FamilyReferralApiResponse {
  referralId: string
  status: string
  createdAt: string
  intakeMode?: "legacy_condensed" | "question_spec_v1"
  intake: Record<string, unknown>
  recommendation: {
    safetyGate: "clear" | "urgent" | "immediate"
    urgencyLevel: "routine" | "priority" | "urgent" | "immediate"
    pathwayKey: string
    specialtyTrack: string
    specialistType: string
    specialistDescription: string
    reasonCodes: string[]
    rationale: string[]
    nextSteps: string[]
    instrumentPack?: string[]
    engineVersion: string
    aiExplanation: string | null
  }
  questionSpec?: {
    version: string
  }
  report: {
    pdfUrl: string
  }
  disclaimer: string
  emergency: {
    call911: boolean
    call988: boolean
  }
}

export type FamilyQuestionResponseType =
  | "ack"
  | "yes_no"
  | "yes_no_unclear"
  | "open_text"
  | "mild_mod_severe"
  | "date_or_age"
  | "confirm"

export type FamilyQuestionRater = "CG" | "PT" | "CG+PT"

export type FamilyQuestionAgeTarget =
  | "all"
  | "0-5"
  | "6-12"
  | "12+"
  | "13+"
  | "13-17"
  | "18-25"
  | "16-30m"
  | "school-age+"

export interface FamilyQuestionSpec {
  id: string
  node: 1 | 2 | 3 | 4 | 5 | 6 | 7
  label: string
  prompt: string
  responseType: FamilyQuestionResponseType
  raters: FamilyQuestionRater[]
  ageTargets: FamilyQuestionAgeTarget[]
  required: boolean
  branch?: {
    askIfQuestionId: string
    askIfValue: "yes"
  }
}

export interface FamilyQuestionSpecResponse {
  version: string
  questions: FamilyQuestionSpec[]
}

export type FamilyQuestionAnswer =
  | {
      kind: "yes_no"
      value: "yes" | "no" | "unclear" | "declined"
    }
  | {
      kind: "open_text"
      value: string
    }
  | {
      kind: "mild_mod_severe"
      value: "mild" | "moderate" | "severe"
    }
  | {
      kind: "date_or_age"
      value: string
    }
  | {
      kind: "ack"
      value: string
    }
  | {
      kind: "confirm"
      value: "yes" | "no" | "unclear" | "declined"
    }

export interface FamilyQuestionResponseInput {
  questionId: string
  rater: "CG" | "PT"
  answer: FamilyQuestionAnswer
  answeredAt?: string
}

export interface FamilyQuestionnaireSubmissionInput {
  childName?: string
  responses: FamilyQuestionResponseInput[]
  metadata?: {
    locale?: string
    source?: "web" | "mobile" | "api"
    startedAt?: string
  }
}

export async function fetchFamilyQuestionSpec() {
  return request<FamilyQuestionSpecResponse>("/api/v1/family-referrals/question-spec", {
    method: "GET",
  })
}

export async function submitFamilyQuestionnaire(input: FamilyQuestionnaireSubmissionInput) {
  return request<FamilyReferralApiResponse>("/api/v1/family-referrals", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createFamilyReferral(input: FamilyQuestionnaireSubmissionInput) {
  return submitFamilyQuestionnaire(input)
}

export async function downloadFamilyReferralPdf(pdfPath: string) {
  return request<Blob>(pdfPath, {
    method: "GET",
  })
}

export function apiPath(path: string) {
  return buildUrl(path)
}
