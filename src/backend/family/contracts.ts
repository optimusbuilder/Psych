import { z } from "zod";

const ageRanges = [
  "3-5",
  "6-8",
  "9-11",
  "12-14",
  "15-17",
  "18+",
] as const;

const childGenders = [
  "female",
  "male",
  "non-binary",
  "prefer-not-to-say",
] as const;

const concernIds = [
  "anxiety",
  "depression",
  "anger",
  "attention",
  "behavior",
  "trauma",
  "social",
  "learning",
  "eating",
  "other",
] as const;

const concernDurations = [
  "less-than-1-month",
  "1-3-months",
  "3-6-months",
  "more-than-6-months",
] as const;

const moodChanges = ["none", "mild", "moderate", "severe"] as const;
const sleepIssues = [
  "normal",
  "difficulty-falling",
  "difficulty-staying",
  "sleeping-more",
  "nightmares",
] as const;
const appetiteChanges = ["normal", "decreased", "increased", "restrictive"] as const;
const socialWithdrawal = ["normal", "some", "significant", "conflict"] as const;
const academicImpact = ["none", "mild", "moderate", "significant"] as const;
const selfHarmThoughts = ["no", "past", "yes", "unsure"] as const;
const selfHarmBehavior = ["no", "past", "current", "unsure"] as const;
const suicidalIdeation = ["no", "passive", "past", "yes"] as const;
const familyHistory = ["no", "yes", "unsure", "prefer-not"] as const;
const recentLifeChanges = [
  "none",
  "family-change",
  "move",
  "loss",
  "illness",
  "academic",
  "social",
  "other",
] as const;
const previousTreatment = ["no", "yes-helpful", "yes-not-helpful", "yes-ongoing"] as const;
const preferredApproach = ["therapy-only", "open-medication", "evaluation", "unsure"] as const;
const insuranceType = [
  "private",
  "medicaid",
  "medicare",
  "military",
  "self-pay",
  "other",
] as const;

const optionalNonEmpty = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }
    return value.length > 0 ? value : undefined;
  });

export const familyReferralCreateSchema = z.object({
  childName: z.string().trim().max(120).optional().default(""),
  childAge: z.enum(ageRanges),
  childGender: z.enum(childGenders),
  primaryConcerns: z.array(z.enum(concernIds)).min(1).max(6),
  concernDescription: optionalNonEmpty,
  concernDuration: z.enum(concernDurations),
  moodChanges: z.enum(moodChanges),
  sleepIssues: z.enum(sleepIssues),
  appetiteChanges: z.enum(appetiteChanges).optional(),
  socialWithdrawal: z.enum(socialWithdrawal).optional(),
  academicImpact: z.enum(academicImpact).optional(),
  selfHarmThoughts: z.enum(selfHarmThoughts),
  selfHarmBehavior: z.enum(selfHarmBehavior).optional(),
  suicidalIdeation: z.enum(suicidalIdeation),
  familyHistory: z.enum(familyHistory),
  recentLifeChanges: z.enum(recentLifeChanges).optional(),
  previousTreatment: z.enum(previousTreatment),
  preferredApproach: z.enum(preferredApproach),
  insuranceType: z.enum(insuranceType).optional(),
});

export type FamilyReferralCreateInput = z.infer<typeof familyReferralCreateSchema>;
