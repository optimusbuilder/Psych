"use client"

import type { IntakeData } from "@/lib/app-context"

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
  const body = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }
  return body as T
}

export interface FamilyReferralApiResponse {
  referralId: string
  status: string
  createdAt: string
  intake: IntakeData
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
    engineVersion: string
    aiExplanation: string | null
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

export async function createFamilyReferral(input: IntakeData) {
  return request<FamilyReferralApiResponse>("/api/v1/family-referrals", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function downloadFamilyReferralPdf(pdfPath: string) {
  return request<Blob>(pdfPath, {
    method: "GET",
  })
}

export function apiPath(path: string) {
  return buildUrl(path)
}
