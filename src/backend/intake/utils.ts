import { randomUUID } from "node:crypto";

export function buildId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function computeOverallSeverity(scores: {
  homeScore: number;
  schoolScore: number;
  peerScore: number;
  safetyLegalScore: number;
}) {
  const maxScore = Math.max(
    scores.homeScore,
    scores.schoolScore,
    scores.peerScore,
    scores.safetyLegalScore,
  );
  if (maxScore >= 7) {
    return "severe" as const;
  }
  if (maxScore >= 4) {
    return "moderate" as const;
  }
  return "mild" as const;
}
