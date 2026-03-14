import { z } from "zod";

export const routeTypeSchema = z.enum(["patient_portal", "provider_portal"]);

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

export const respondentSchema = z.object({
  type: z.enum(["patient", "caregiver", "clinician"]),
  relationshipToPatient: z.string().optional(),
  ageIfPatient: z.number().int().min(0).max(25).optional(),
});

export const safetySchema = z.object({
  suicidalRiskFlag: z.boolean(),
  violenceRiskFlag: z.boolean(),
  psychosisManiaFlag: z.boolean(),
  notes: z.string().optional(),
});

export const symptomSchema = z.object({
  primaryFamily: z.string().min(1),
  secondaryFamilies: z.array(z.string()).default([]),
  isMixedUnclear: z.boolean().default(false),
});

export const functionalImpactSchema = z.object({
  homeScore: z.number().int().min(0).max(10),
  schoolScore: z.number().int().min(0).max(10),
  peerScore: z.number().int().min(0).max(10),
  safetyLegalScore: z.number().int().min(0).max(10),
});

export const scoreInstrumentSchema = z.object({
  rawScore: z.number().min(0),
  structuredJson: z.record(z.any()).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type RespondentInput = z.infer<typeof respondentSchema>;
export type SafetyInput = z.infer<typeof safetySchema>;
export type SymptomInput = z.infer<typeof symptomSchema>;
export type FunctionalImpactInput = z.infer<typeof functionalImpactSchema>;
export type ScoreInstrumentInput = z.infer<typeof scoreInstrumentSchema>;
