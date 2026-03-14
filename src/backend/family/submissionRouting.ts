import type {
  FamilyQuestionnaireSubmissionInput,
  FamilyReferralSubmissionInput,
} from "./contracts";
import {
  createFamilyRoutingOutput,
  type FamilyRoutingOutput,
} from "./routing";
import { createFamilyRoutingOutputFromQuestionnaire } from "./questionnaireRouting";

export function isQuestionnaireSubmission(
  input: FamilyReferralSubmissionInput,
): input is FamilyQuestionnaireSubmissionInput {
  return "responses" in input;
}

export function createFamilyRoutingOutputFromSubmission(
  input: FamilyReferralSubmissionInput,
  referenceDate: Date = new Date(),
): FamilyRoutingOutput {
  if (isQuestionnaireSubmission(input)) {
    return createFamilyRoutingOutputFromQuestionnaire(input, referenceDate);
  }
  return createFamilyRoutingOutput(input, referenceDate);
}
