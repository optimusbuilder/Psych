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
  const values = [
    scores.homeScore,
    scores.schoolScore,
    scores.peerScore,
    scores.safetyLegalScore,
  ];
  const maxScore = Math.max(...values);
  const domainsAtLeast7 = values.filter((value) => value >= 7).length;
  const domainsAtLeast4 = values.filter((value) => value >= 4).length;

  if (maxScore >= 8 || scores.safetyLegalScore >= 7 || domainsAtLeast7 >= 2) {
    return "severe" as const;
  }
  if (maxScore >= 4 || domainsAtLeast4 >= 2) {
    return "moderate" as const;
  }
  return "mild" as const;
}
