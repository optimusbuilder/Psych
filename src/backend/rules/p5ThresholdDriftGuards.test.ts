// @vitest-environment node

import { describe, expect, it } from "vitest";
import { evaluateTriageRules } from "./engine";

const referenceDate = new Date("2026-03-14T00:00:00.000Z");

function baseInput(family: string) {
  return {
    patientDob: "2012-06-01",
    safetyAssessment: {
      suicidalRiskFlag: false,
      violenceRiskFlag: false,
      psychosisManiaFlag: false,
      requiresImmediateReview: false,
      escalationLevel: "none" as const,
    },
    symptomAssessment: {
      primaryFamily: family,
      secondaryFamilies: [],
      isMixedUnclear: false,
      familyScores: {
        [family]: 2.2,
      },
      insufficientData: false,
      mixedSignals: false,
    },
    functionalImpact: {
      homeScore: 5,
      schoolScore: 5,
      peerScore: 4,
      safetyLegalScore: 2,
      rapidWorsening: false,
    },
    referenceDate,
  };
}

describe("P5-Threshold-Drift-Guards", () => {
  it("holds severity boundary behavior at n-1, n, and n+1 cutoffs", () => {
    const mild = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      functionalImpact: {
        homeScore: 3,
        schoolScore: 3,
        peerScore: 3,
        safetyLegalScore: 3,
      },
    });
    const moderateAt4 = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      functionalImpact: {
        homeScore: 4,
        schoolScore: 3,
        peerScore: 2,
        safetyLegalScore: 1,
      },
    });
    const severeAt8 = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      functionalImpact: {
        homeScore: 8,
        schoolScore: 3,
        peerScore: 3,
        safetyLegalScore: 2,
      },
    });
    const severeSafetyLegal7 = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      functionalImpact: {
        homeScore: 4,
        schoolScore: 4,
        peerScore: 4,
        safetyLegalScore: 7,
      },
    });

    expect(mild.severityTier).toBe("mild");
    expect(moderateAt4.severityTier).toBe("moderate");
    expect(severeAt8.severityTier).toBe("severe");
    expect(severeSafetyLegal7.severityTier).toBe("severe");
  });

  it("forces clinician review for mixed tied top families", () => {
    const result = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      symptomAssessment: {
        primaryFamily: "Anxiety / Worry / Panic",
        secondaryFamilies: ["Mood / Depression / Irritability"],
        isMixedUnclear: false,
        familyScores: {
          "Anxiety / Worry / Panic": 2.2,
          "Mood / Depression / Irritability": 2.1,
        },
        insufficientData: false,
        mixedSignals: false,
      },
    });

    expect(result.isMixedUnclear).toBe(true);
    expect(result.pathwayKey).toBe("clinician_review_required");
    expect(result.requiresClinicianReview).toBe(true);
  });

  it("escalates conduct red flags to urgent specialty routing", () => {
    const result = evaluateTriageRules({
      ...baseInput("Conduct-Type Behaviors"),
      symptomAssessment: {
        primaryFamily: "Conduct-Type Behaviors",
        secondaryFamilies: [],
        isMixedUnclear: false,
        familyScores: {
          "Conduct-Type Behaviors": 2.4,
        },
        insufficientData: false,
        mixedSignals: false,
        conductRedFlags: {
          weaponIncident: true,
        },
      },
    });

    expect(result.pathwayKey).toBe("urgent_specialty_psychiatry");
    expect(result.urgencyLevel).toBe("urgent");
    expect(result.specialtyTrack).toBe("conduct_high_risk_track");
    expect(result.requiresClinicianReview).toBe(true);
  });

  it("routes insufficient symptom data to clinician review", () => {
    const result = evaluateTriageRules({
      ...baseInput("Anxiety / Worry / Panic"),
      symptomAssessment: {
        primaryFamily: "Anxiety / Worry / Panic",
        secondaryFamilies: [],
        isMixedUnclear: false,
        familyScores: {
          "Anxiety / Worry / Panic": 1.6,
        },
        insufficientData: true,
        mixedSignals: false,
      },
      functionalImpact: {
        homeScore: 2,
        schoolScore: 2,
        peerScore: 2,
        safetyLegalScore: 2,
      },
    });

    expect(result.insufficientData).toBe(true);
    expect(result.pathwayKey).toBe("clinician_review_required");
    expect(result.requiresClinicianReview).toBe(true);
  });

  it("maintains route diversification for non-safety moderate cases", () => {
    const families = [
      "Mood / Depression / Irritability",
      "ADHD / Attention / Hyperactivity",
      "Trauma / Stress-Related Symptoms",
      "Autism / Developmental / Social Communication",
      "Substance Use",
      "Eating / Body Image Concerns",
    ];

    const results = families.map((family) =>
      evaluateTriageRules({
        ...baseInput(family),
        symptomAssessment: {
          primaryFamily: family,
          secondaryFamilies: [],
          isMixedUnclear: false,
          familyScores: {
            [family]: 2.2,
          },
          insufficientData: false,
          mixedSignals: false,
        },
      }),
    );

    const trackSet = new Set(results.map((result) => result.specialtyTrack));
    expect(trackSet.size).toBeGreaterThanOrEqual(6);

    const nonSafety = results.filter((result) => result.pathwayKey !== "immediate_urgent_review");
    const routeCounts = new Map<string, number>();
    for (const result of nonSafety) {
      routeCounts.set(result.pathwayKey, (routeCounts.get(result.pathwayKey) ?? 0) + 1);
    }

    const maxCount = Math.max(...Array.from(routeCounts.values()));
    expect(maxCount / nonSafety.length).toBeLessThanOrEqual(0.7);
  });

  it("never clears safety-positive fixtures", () => {
    const fixtures = [
      {
        detailFlags: {
          suicidalPlanOrIntent: true,
        },
      },
      {
        detailFlags: {
          violentPlan: true,
        },
      },
      {
        detailFlags: {
          fireSetting: true,
        },
      },
      {
        detailFlags: {
          severeIntoxicationWithdrawalOverdose: true,
        },
      },
      {
        suicidalRiskFlag: true,
      },
    ];

    for (const fixture of fixtures) {
      const result = evaluateTriageRules({
        ...baseInput("Mood / Depression / Irritability"),
        safetyAssessment: {
          suicidalRiskFlag: Boolean((fixture as { suicidalRiskFlag?: boolean }).suicidalRiskFlag),
          violenceRiskFlag: false,
          psychosisManiaFlag: false,
          requiresImmediateReview: true,
          escalationLevel: "urgent",
          detailFlags: (fixture as { detailFlags?: Record<string, boolean> }).detailFlags,
        },
      });

      expect(result.safetyGate).not.toBe("clear");
      expect(result.pathwayKey).toBe("immediate_urgent_review");
      expect(["urgent", "immediate"]).toContain(result.urgencyLevel);
    }
  });

  it("keeps moderate family tracks deterministic for known families", () => {
    const expectedTracks: Array<{ family: string; track: string }> = [
      { family: "Mood / Depression / Irritability", track: "mood_anxiety_track" },
      { family: "Anxiety / Worry / Panic", track: "mood_anxiety_track" },
      { family: "ADHD / Attention / Hyperactivity", track: "adhd_externalizing_track" },
      { family: "Behavioral Dysregulation / Defiance / Aggression", track: "adhd_externalizing_track" },
      { family: "Conduct-Type Behaviors", track: "conduct_high_risk_track" },
      { family: "Trauma / Stress-Related Symptoms", track: "trauma_track" },
      { family: "Autism / Developmental / Social Communication", track: "developmental_autism_track" },
      { family: "Substance Use", track: "substance_track" },
      { family: "Eating / Body Image Concerns", track: "eating_track" },
      { family: "Psychosis / Mania-Like Symptoms", track: "psychosis_mania_track" },
      { family: "Mixed / Unclear", track: "mixed_unclear_track" },
    ];

    for (const item of expectedTracks) {
      const result = evaluateTriageRules({
        ...baseInput(item.family),
        symptomAssessment: {
          primaryFamily: item.family,
          secondaryFamilies: [],
          isMixedUnclear: item.family === "Mixed / Unclear",
          familyScores:
            item.family === "Mixed / Unclear"
              ? {
                  "Anxiety / Worry / Panic": 2,
                  "Mood / Depression / Irritability": 2,
                }
              : { [item.family]: 2.2 },
          insufficientData: false,
          mixedSignals: item.family === "Mixed / Unclear",
        },
      });

      expect(result.specialtyTrack, item.family).toBe(item.track);
    }
  });
});
