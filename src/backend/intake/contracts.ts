import { z } from "zod";

export const routeTypeSchema = z.enum(["patient_portal", "provider_portal"]);

const safetyDetailFlagsSchema = z.object({
  immediateDangerNow: z.boolean().optional(),
  suicidalPlanOrIntent: z.boolean().optional(),
  suicideAttemptPast3Months: z.boolean().optional(),
  violentPlan: z.boolean().optional(),
  violentTarget: z.boolean().optional(),
  violentMeansAccess: z.boolean().optional(),
  fireSetting: z.boolean().optional(),
  weaponUseOrAccessForHarm: z.boolean().optional(),
  severeIntoxicationWithdrawalOverdose: z.boolean().optional(),
  severePsychosisManiaDisorganization: z.boolean().optional(),
  abuseNeglectConcern: z.boolean().optional(),
});

export const createSessionSchema = z.object({
  routeType: routeTypeSchema,
  patient: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dob: z.string().min(1),
    sexAtBirth: z.enum(["female", "male", "intersex", "unknown"]).optional(),
    guardianContact: z.string().optional(),
    hospitalMrn: z.string().optional(),
    linkedOrgId: z.string().optional(),
  }),
  startedByUserId: z.string().optional(),
});

export const referringProviderSchema = z.object({
  providerName: z.string().optional(),
  clinicalNote: z.string().min(1),
  communicationProfile: z
    .enum(["verbal_typical", "limited_verbal", "nonverbal", "unknown"])
    .optional(),
  developmentalDelayConcern: z.boolean().optional(),
  autismConcern: z.boolean().optional(),
});

export const safetySchema = z.object({
  suicidalRiskFlag: z.boolean(),
  violenceRiskFlag: z.boolean(),
  psychosisManiaFlag: z.boolean(),
  notes: z.string().optional(),
  detailFlags: safetyDetailFlagsSchema.optional(),
});

export const symptomSchema = z.object({
  primaryFamily: z.string().min(1),
  secondaryFamilies: z.array(z.string()).default([]),
  isMixedUnclear: z.boolean().default(false),
  familyScores: z.record(z.number().min(0).max(4)).optional(),
  mostImpairingConcern: z.string().optional(),
  insufficientData: z.boolean().optional(),
  mixedSignals: z.boolean().optional(),
  conductRedFlags: z
    .object({
      cruelty: z.boolean().optional(),
      fireSetting: z.boolean().optional(),
      weaponIncident: z.boolean().optional(),
      seriousViolenceHistory: z.boolean().optional(),
    })
    .optional(),
});

export const functionalImpactSchema = z.object({
  homeScore: z.number().int().min(0).max(10),
  schoolScore: z.number().int().min(0).max(10),
  peerScore: z.number().int().min(0).max(10),
  safetyLegalScore: z.number().int().min(0).max(10),
  rapidWorsening: z.boolean().optional(),
});

export const scoreInstrumentSchema = z.object({
  rawScore: z.number().min(0),
  structuredJson: z.record(z.any()).optional(),
});

export const clinicianOverrideSchema = z.object({
  overrideApplied: z.boolean().default(true),
  finalDisposition: z.string().min(1),
  rationale: z.string().min(1),
  finalizeSession: z.boolean().default(true),
});

export const createReferralSchema = z.object({
  patient: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dob: z.string().min(1),
    sexAtBirth: z.enum(["female", "male", "intersex", "unknown"]).optional(),
    guardianContact: z.string().optional(),
    hospitalMrn: z.string().optional(),
    linkedOrgId: z.string().optional(),
  }),
  referringProvider: referringProviderSchema,
  safety: safetySchema,
  symptoms: symptomSchema,
  functionalImpact: functionalImpactSchema,
  startedByUserId: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ReferringProviderInput = z.infer<typeof referringProviderSchema>;
export type SafetyInput = z.infer<typeof safetySchema>;
export type SymptomInput = z.infer<typeof symptomSchema>;
export type FunctionalImpactInput = z.infer<typeof functionalImpactSchema>;
export type ScoreInstrumentInput = z.infer<typeof scoreInstrumentSchema>;
export type ClinicianOverrideInput = z.infer<typeof clinicianOverrideSchema>;
export type CreateReferralInput = z.infer<typeof createReferralSchema>;
