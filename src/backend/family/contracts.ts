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

const questionIdSchema = z
  .string()
  .regex(/^(ASQ-[1-5]|[1-7][A-Z]?\.[0-9]+|5\.0)$/);

const yesNoAnswerSchema = z.object({
  kind: z.literal("yes_no"),
  value: z.enum(["yes", "no", "unclear", "declined"]),
});

const openTextAnswerSchema = z.object({
  kind: z.literal("open_text"),
  value: z.string().trim().min(1).max(4000),
});

const mildModSevereAnswerSchema = z.object({
  kind: z.literal("mild_mod_severe"),
  value: z.enum(["mild", "moderate", "severe"]),
});

const dateOrAgeAnswerSchema = z.object({
  kind: z.literal("date_or_age"),
  value: z.string().trim().min(1).max(80),
});

const ackAnswerSchema = z.object({
  kind: z.literal("ack"),
  value: z.string().trim().min(1).max(120).default("acknowledged"),
});

const confirmAnswerSchema = z.object({
  kind: z.literal("confirm"),
  value: z.enum(["yes", "no", "unclear", "declined"]),
});

export const familyQuestionAnswerSchema = z.union([
  yesNoAnswerSchema,
  openTextAnswerSchema,
  mildModSevereAnswerSchema,
  dateOrAgeAnswerSchema,
  ackAnswerSchema,
  confirmAnswerSchema,
]);

export const familyQuestionResponseSchema = z.object({
  questionId: questionIdSchema,
  rater: z.enum(["CG", "PT"]),
  answer: familyQuestionAnswerSchema,
  answeredAt: z.string().datetime().optional(),
});

export const familyQuestionnaireSubmissionSchema = z.object({
  childName: z.string().trim().max(120).optional().default(""),
  responses: z.array(familyQuestionResponseSchema).min(1),
  metadata: z
    .object({
      locale: z.string().max(40).optional(),
      source: z.enum(["web", "mobile", "api"]).optional(),
      startedAt: z.string().datetime().optional(),
    })
    .optional(),
});

export const familyReferralSubmissionSchema = z.union([
  familyReferralCreateSchema,
  familyQuestionnaireSubmissionSchema,
]);

export type FamilyQuestionAnswerInput = z.infer<typeof familyQuestionAnswerSchema>;
export type FamilyQuestionResponseInput = z.infer<typeof familyQuestionResponseSchema>;
export type FamilyQuestionnaireSubmissionInput = z.infer<
  typeof familyQuestionnaireSubmissionSchema
>;
export type FamilyReferralSubmissionInput = z.infer<
  typeof familyReferralSubmissionSchema
>;
