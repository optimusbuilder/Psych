import type { RecommendationResult } from "@/lib/app-context"

import routingFixture from "@/mocks/demo-routing.json"
import ehrFixture from "@/mocks/demo-ehr.json"
import scenarioFixture from "@/mocks/demo-scenarios.json"

export type DemoScenarioKey =
  | "happy_path_psychology"
  | "urgent_needs_auth_psychiatry"
  | "no_availability_developmental"
  | "immediate_safety_bypass"

export type DemoStepName =
  | "verifyPatient"
  | "checkEligibility"
  | "createReferralOrder"
  | "matchAvailability"
  | "confirmBooking"
  | "safetyBypass"

export interface DemoProviderSlot {
  slotId: string
  start: string
  end: string
  mode: "virtual" | "in_person"
  status: "open" | "booked"
}

export interface DemoProvider {
  providerId: string
  name: string
  specialty: string
  location: string
  slots: DemoProviderSlot[]
}

interface RoutingRule {
  specialistType: string
  primaryProviderId: string
  fallbackProviderIds: string[]
}

interface RoutingFixture {
  version: string
  timezone: string
  routingMap: RoutingRule[]
  providers: DemoProvider[]
}

interface EhrPatient {
  lookupKey: string
  patientId: string | null
  childName: string | null
  dob?: string | null
  guardianName?: string | null
  payer: string | null
  memberId?: string | null
  networkStatus?: string | null
}

interface EligibilityRule {
  payer: string
  status: "ELIGIBLE" | "NEEDS_AUTH" | "COVERAGE_MISMATCH"
  authRequired: boolean
  authCaseId?: string
}

interface EhrFixture {
  ehrPatients: EhrPatient[]
  eligibilityRules: EligibilityRule[]
}

type ScenarioResult = Record<string, string | number | boolean | null | string[]>

interface ScenarioStep {
  step: DemoStepName
  result: ScenarioResult
}

interface ScenarioTemplate {
  input: {
    referralId: string
    patientLookupKey: string
  }
  timeline: ScenarioStep[]
  finalEventLog: string[]
}

interface ScenarioFixture {
  scenarioFixtures: Record<DemoScenarioKey, ScenarioTemplate>
}

const routingData = routingFixture as RoutingFixture
const ehrData = ehrFixture as EhrFixture
const scenarioData = scenarioFixture as ScenarioFixture

const STEP_TITLES: Record<DemoStepName, string> = {
  verifyPatient: "Verifying patient in EHR",
  checkEligibility: "Checking coverage eligibility",
  createReferralOrder: "Creating referral order",
  matchAvailability: "Matching specialist availability",
  confirmBooking: "Confirming appointment",
  safetyBypass: "Immediate safety escalation",
}

const STEP_LOADING: Record<DemoStepName, string> = {
  verifyPatient: "Syncing with EHR...",
  checkEligibility: "Checking insurance eligibility...",
  createReferralOrder: "Posting referral to EHR...",
  matchAvailability: "Finding the earliest matched appointments...",
  confirmBooking: "Finalizing the appointment...",
  safetyBypass: "Escalating to immediate support resources...",
}

function parseString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function openSlots(provider: DemoProvider | undefined) {
  if (!provider) {
    return []
  }
  return provider.slots.filter((slot) => slot.status === "open")
}

function scenarioForRecommendation(recommendation: RecommendationResult): DemoScenarioKey {
  if (
    recommendation.safetyGate === "immediate" ||
    recommendation.urgencyLevel === "immediate" ||
    recommendation.specialistType === "Crisis Mental Health Services"
  ) {
    return "immediate_safety_bypass"
  }
  if (recommendation.specialistType === "Developmental-Behavioral Pediatrician") {
    return "no_availability_developmental"
  }
  if (
    recommendation.specialistType === "Child & Adolescent Psychiatrist" ||
    recommendation.urgencyLevel === "urgent"
  ) {
    return "urgent_needs_auth_psychiatry"
  }
  return "happy_path_psychology"
}

function findRoutingRule(specialistType: string) {
  return routingData.routingMap.find((rule) => rule.specialistType === specialistType)
}

function findPatient(lookupKey: string) {
  return ehrData.ehrPatients.find((patient) => patient.lookupKey === lookupKey) ?? null
}

export interface DemoSchedulingStep {
  step: DemoStepName
  result: ScenarioResult
}

export interface DemoSchedulingSession {
  scenarioKey: DemoScenarioKey
  specialistType: string
  referralId: string
  timezone: string
  patient: EhrPatient | null
  timeline: DemoSchedulingStep[]
  finalEventLog: string[]
  providersById: Record<string, DemoProvider>
}

export function createDemoSchedulingSession(params: {
  recommendation: RecommendationResult
  childName?: string
}): DemoSchedulingSession {
  const { recommendation, childName } = params
  const scenarioKey = scenarioForRecommendation(recommendation)
  const scenarioTemplate = scenarioData.scenarioFixtures[scenarioKey]

  const providersById = Object.fromEntries(
    routingData.providers.map((provider) => [provider.providerId, provider]),
  ) as Record<string, DemoProvider>

  const routingRule =
    findRoutingRule(recommendation.specialistType) ??
    findRoutingRule("Pediatric Psychologist (Comprehensive Evaluation)")

  const primaryProviderId = routingRule?.primaryProviderId
  const fallbackProviderIds = routingRule?.fallbackProviderIds ?? []
  const primaryProvider = primaryProviderId ? providersById[primaryProviderId] : undefined
  const fallbackProvider =
    fallbackProviderIds.map((providerId) => providersById[providerId]).find((provider) => openSlots(provider).length > 0) ??
    providersById["prov-tran"] ??
    routingData.providers[0]

  const patient =
    findPatient(scenarioTemplate.input.patientLookupKey) ??
    (childName
      ? {
          lookupKey: "runtime-child-name",
          patientId: null,
          childName,
          payer: "BlueCross PPO",
        }
      : null)

  const timeline = scenarioTemplate.timeline.map((entry) => ({
    step: entry.step,
    result: { ...entry.result },
  }))

  for (const entry of timeline) {
    if (entry.step === "verifyPatient") {
      if (entry.result.status === "FOUND") {
        entry.result.patientId = patient?.patientId ?? "EHR-UNKNOWN"
      }
      if (entry.result.status === "CREATED" && !parseString(entry.result.patientId)) {
        entry.result.patientId = "EHR-NEW-39012"
      }
    }

    if (entry.step === "checkEligibility") {
      if (entry.result.status === "ELIGIBLE") {
        const payer = patient?.payer ?? "BlueCross PPO"
        entry.result.payer = payer
      }
      if (entry.result.status === "NEEDS_AUTH") {
        const payer = patient?.payer ?? "United Behavioral HMO"
        entry.result.payer = payer
      }
    }

    if (entry.step === "matchAvailability") {
      const primarySlotIds = openSlots(primaryProvider)
        .slice(0, 2)
        .map((slot) => slot.slotId)
      const fallbackSlotIds = openSlots(fallbackProvider)
        .slice(0, 2)
        .map((slot) => slot.slotId)

      if (entry.result.status === "SLOTS_FOUND") {
        if (primaryProvider && primarySlotIds.length > 0) {
          entry.result.providerId = primaryProvider.providerId
          entry.result.slotIds = primarySlotIds
        } else {
          entry.result.status = "NO_PRIMARY_SLOTS"
          entry.result.primaryProviderId = primaryProvider?.providerId ?? null
          entry.result.fallbackProviderId = fallbackProvider?.providerId ?? null
          entry.result.fallbackSlotIds = fallbackSlotIds
        }
      }

      if (entry.result.status === "NO_PRIMARY_SLOTS") {
        entry.result.primaryProviderId = primaryProvider?.providerId ?? entry.result.primaryProviderId ?? null
        entry.result.fallbackProviderId = fallbackProvider?.providerId ?? entry.result.fallbackProviderId ?? null
        entry.result.fallbackSlotIds = fallbackSlotIds
      }
    }
  }

  const matchEntry = timeline.find((entry) => entry.step === "matchAvailability")
  const confirmationEntry = timeline.find((entry) => entry.step === "confirmBooking")
  if (matchEntry && confirmationEntry) {
    if (matchEntry.result.status === "SLOTS_FOUND") {
      const slotIds = parseStringArray(matchEntry.result.slotIds)
      confirmationEntry.result.providerId = parseString(matchEntry.result.providerId)
      if (slotIds.length > 0) {
        confirmationEntry.result.slotId = slotIds[0]
      }
    }
    if (matchEntry.result.status === "NO_PRIMARY_SLOTS") {
      confirmationEntry.result.fallbackProviderId = parseString(matchEntry.result.fallbackProviderId)
      const fallbackSlotIds = parseStringArray(matchEntry.result.fallbackSlotIds)
      if (fallbackSlotIds.length > 0) {
        confirmationEntry.result.fallbackSlotId = fallbackSlotIds[0]
      }
    }
  }

  return {
    scenarioKey,
    specialistType: recommendation.specialistType,
    referralId: recommendation.referralId || scenarioTemplate.input.referralId,
    timezone: routingData.timezone,
    patient,
    timeline,
    finalEventLog: [...scenarioTemplate.finalEventLog],
    providersById,
  }
}

export function getDemoStepTitle(step: DemoStepName) {
  return STEP_TITLES[step]
}

export function getDemoStepLoadingText(step: DemoStepName) {
  return STEP_LOADING[step]
}

export interface DemoSlotOption {
  provider: DemoProvider
  slot: DemoProviderSlot
  isFallback: boolean
}

function lookupSlot(session: DemoSchedulingSession, providerId: string | undefined, slotId: string | undefined) {
  if (!providerId || !slotId) {
    return null
  }
  const provider = session.providersById[providerId]
  if (!provider) {
    return null
  }
  const slot = provider.slots.find((entry) => entry.slotId === slotId)
  if (!slot) {
    return null
  }
  return { provider, slot }
}

export function getSlotOptionsForMatchStep(
  session: DemoSchedulingSession,
  step: DemoSchedulingStep,
): DemoSlotOption[] {
  if (step.step !== "matchAvailability") {
    return []
  }

  if (step.result.status === "SLOTS_FOUND") {
    const providerId = parseString(step.result.providerId)
    const slotIds = parseStringArray(step.result.slotIds)
    return slotIds
      .map((slotId) => lookupSlot(session, providerId, slotId))
      .filter((entry): entry is { provider: DemoProvider; slot: DemoProviderSlot } => Boolean(entry))
      .map((entry) => ({
        provider: entry.provider,
        slot: entry.slot,
        isFallback: false,
      }))
  }

  if (step.result.status === "NO_PRIMARY_SLOTS") {
    const providerId = parseString(step.result.fallbackProviderId)
    const slotIds = parseStringArray(step.result.fallbackSlotIds)
    return slotIds
      .map((slotId) => lookupSlot(session, providerId, slotId))
      .filter((entry): entry is { provider: DemoProvider; slot: DemoProviderSlot } => Boolean(entry))
      .map((entry) => ({
        provider: entry.provider,
        slot: entry.slot,
        isFallback: true,
      }))
  }

  return []
}

export function formatSlotLabel(slot: DemoProviderSlot, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(slot.start))
}

export function describeDemoStepOutcome(params: {
  session: DemoSchedulingSession
  step: DemoSchedulingStep
  selectedSlotId?: string | null
}): string {
  const { session, step, selectedSlotId } = params

  switch (step.step) {
    case "verifyPatient": {
      if (step.result.status === "FOUND") {
        return `Patient chart found: ${session.patient?.childName ?? "Patient"} (${parseString(step.result.patientId) ?? "MRN pending"}).`
      }
      if (step.result.status === "CREATED") {
        return `No chart found. Created a new chart (${parseString(step.result.patientId) ?? "EHR-NEW-39012"}).`
      }
      return "Patient chart check complete."
    }
    case "checkEligibility": {
      if (step.result.status === "ELIGIBLE") {
        return `Coverage verified: ${parseString(step.result.payer) ?? "In-network coverage"}.`
      }
      if (step.result.status === "NEEDS_AUTH") {
        return `Coverage requires prior authorization (case ${parseString(step.result.authCaseId) ?? "AUTH-PENDING"}).`
      }
      if (step.result.status === "COVERAGE_MISMATCH") {
        return "Coverage mismatch detected. Out-of-network pathway would be needed."
      }
      return "Coverage check complete."
    }
    case "createReferralOrder": {
      if (step.result.status === "SUBMITTED") {
        return `Referral created: ${parseString(step.result.referralOrderId) ?? "REF-DEMO"}.`
      }
      if (step.result.status === "PENDING_SIGNATURE") {
        return `Referral draft created and pending signature (${parseString(step.result.referralOrderId) ?? "REF-DEMO"}).`
      }
      return "Referral order step completed."
    }
    case "matchAvailability": {
      if (step.result.status === "SLOTS_FOUND") {
        const provider = parseString(step.result.providerId)
        const providerName = provider ? session.providersById[provider]?.name : null
        return `Matched with ${providerName ?? "the recommended specialist"} and found available appointments.`
      }
      if (step.result.status === "NO_PRIMARY_SLOTS") {
        const fallbackProviderId = parseString(step.result.fallbackProviderId)
        const fallbackName = fallbackProviderId ? session.providersById[fallbackProviderId]?.name : null
        return `No immediate primary slots available. Showing fallback options with ${fallbackName ?? "the backup provider"}.`
      }
      return "Availability check complete."
    }
    case "confirmBooking": {
      if (step.result.bookingStatus === "CONFIRMED") {
        const providerId = parseString(step.result.providerId)
        const slotId = selectedSlotId ?? parseString(step.result.slotId)
        const slotMatch = lookupSlot(session, providerId, slotId)
        const bookingId = parseString(step.result.bookingId) ?? "SCH-DEMO"
        if (slotMatch) {
          return `Booked with ${slotMatch.provider.name} on ${formatSlotLabel(slotMatch.slot, session.timezone)}. Confirmation: ${bookingId}.`
        }
        return `Appointment confirmed. Confirmation: ${bookingId}.`
      }
      if (step.result.bookingStatus === "TENTATIVE_HELD") {
        const holdId = parseString(step.result.holdId) ?? "HOLD-DEMO"
        return `Tentative appointment hold created pending authorization (${holdId}).`
      }
      if (step.result.bookingStatus === "WAITLISTED") {
        return `Added to waitlist (${parseString(step.result.waitlistId) ?? "WAITLIST-DEMO"}).`
      }
      return "Booking step completed."
    }
    case "safetyBypass":
      return "Immediate crisis support is recommended now. Routine scheduling is paused."
    default:
      return "Step completed."
  }
}

export function buildEventLogLine(step: DemoSchedulingStep): string {
  switch (step.step) {
    case "verifyPatient":
      return step.result.status === "CREATED" ? "Patient chart created" : "Patient verified"
    case "checkEligibility":
      return `Coverage checked (${parseString(step.result.status) ?? "UNKNOWN"})`
    case "createReferralOrder":
      return `Referral processed (${parseString(step.result.referralOrderId) ?? "ID pending"})`
    case "matchAvailability":
      return step.result.status === "NO_PRIMARY_SLOTS"
        ? "Primary specialist full; fallback offered"
        : "Matched appointment options generated"
    case "confirmBooking":
      if (step.result.bookingStatus === "WAITLISTED") {
        return `Waitlist enrollment created (${parseString(step.result.waitlistId) ?? "WAITLIST-DEMO"})`
      }
      if (step.result.bookingStatus === "TENTATIVE_HELD") {
        return `Tentative hold created (${parseString(step.result.holdId) ?? "HOLD-DEMO"})`
      }
      return `Appointment confirmed (${parseString(step.result.bookingId) ?? "SCH-DEMO"})`
    case "safetyBypass":
      return "Routine booking bypassed due to immediate safety signal"
    default:
      return "Workflow step completed"
  }
}
