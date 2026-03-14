// @vitest-environment node

import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Application } from "express";
import { createRequest, createResponse } from "node-mocks-http";
import { newDb } from "pg-mem";
import { describe, expect, it } from "vitest";
import { createBackendApp } from "../api/createApp";
import {
  RULE_ENGINE_VERSION,
  evaluateTriageRules,
  type PathwayKey,
  type SeverityTier,
  type UrgencyLevel,
} from "./engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationSql = readFileSync(
  path.resolve(__dirname, "../../../db/migrations/001_phase2_core_schema.sql"),
  "utf8",
);
const referenceDate = new Date("2026-03-14T00:00:00.000Z");

interface Fixture {
  name: string;
  input: Parameters<typeof evaluateTriageRules>[0];
  expected: {
    ageBand: string;
    severityTier: SeverityTier;
    pathwayKey: PathwayKey;
    requiresClinicianReview: boolean;
    urgencyLevel: UrgencyLevel;
    reasonCode: string;
  };
}

const fixtureMatrix: Fixture[] = [
  {
    name: "early-childhood autism with mild impairment",
    input: {
      patientDob: "2020-04-01",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Autism / Developmental / Social Communication",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 1,
        schoolScore: 2,
        peerScore: 3,
        safetyLegalScore: 0,
      },
      referenceDate,
    },
    expected: {
      ageBand: "early_childhood",
      severityTier: "mild",
      pathwayKey: "developmental_evaluation_referral",
      requiresClinicianReview: false,
      urgencyLevel: "routine",
      reasonCode: "ROUTE_DEVELOPMENTAL_EVALUATION",
    },
  },
  {
    name: "school-age anxiety with moderate impairment",
    input: {
      patientDob: "2015-02-20",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Anxiety / Worry / Panic",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 4,
        schoolScore: 5,
        peerScore: 3,
        safetyLegalScore: 1,
      },
      referenceDate,
    },
    expected: {
      ageBand: "school_age",
      severityTier: "moderate",
      pathwayKey: "targeted_screening_and_clinician_review",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      reasonCode: "ROUTE_TARGETED_SCREENING",
    },
  },
  {
    name: "adolescent mood with severe impairment",
    input: {
      patientDob: "2010-03-01",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Mood / Depression / Irritability",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 5,
        schoolScore: 8,
        peerScore: 6,
        safetyLegalScore: 2,
      },
      referenceDate,
    },
    expected: {
      ageBand: "adolescent",
      severityTier: "severe",
      pathwayKey: "urgent_specialty_psychiatry",
      requiresClinicianReview: true,
      urgencyLevel: "urgent",
      reasonCode: "SEVERITY_SEVERE",
    },
  },
  {
    name: "transitional young adult substance use mild",
    input: {
      patientDob: "2005-01-02",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Substance Use",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 1,
        schoolScore: 1,
        peerScore: 2,
        safetyLegalScore: 3,
      },
      referenceDate,
    },
    expected: {
      ageBand: "transitional_young_adult",
      severityTier: "mild",
      pathwayKey: "substance_use_counseling_referral",
      requiresClinicianReview: false,
      urgencyLevel: "priority",
      reasonCode: "ROUTE_SUBSTANCE_REFERRAL",
    },
  },
  {
    name: "mixed presentation routes to clinician review",
    input: {
      patientDob: "2016-01-02",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Mixed / Unclear",
        isMixedUnclear: true,
      },
      functionalImpact: {
        homeScore: 2,
        schoolScore: 2,
        peerScore: 3,
        safetyLegalScore: 1,
      },
      referenceDate,
    },
    expected: {
      ageBand: "school_age",
      severityTier: "mild",
      pathwayKey: "clinician_review_required",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      reasonCode: "MIXED_OR_UNCLEAR_PRESENTATION",
    },
  },
  {
    name: "safety-positive always overrides routing",
    input: {
      patientDob: "2016-01-01",
      safetyAssessment: {
        suicidalRiskFlag: true,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: true,
      },
      symptomAssessment: {
        primaryFamily: "Autism / Developmental",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 1,
        schoolScore: 1,
        peerScore: 1,
        safetyLegalScore: 1,
      },
      referenceDate,
    },
    expected: {
      ageBand: "school_age",
      severityTier: "mild",
      pathwayKey: "immediate_urgent_review",
      requiresClinicianReview: true,
      urgencyLevel: "urgent",
      reasonCode: "SAFETY_OVERRIDE",
    },
  },
  {
    name: "out-of-range age requires clinician review",
    input: {
      patientDob: "1994-06-01",
      safetyAssessment: {
        suicidalRiskFlag: false,
        violenceRiskFlag: false,
        psychosisManiaFlag: false,
        requiresImmediateReview: false,
      },
      symptomAssessment: {
        primaryFamily: "Mood / Depression / Irritability",
        isMixedUnclear: false,
      },
      functionalImpact: {
        homeScore: 1,
        schoolScore: 2,
        peerScore: 2,
        safetyLegalScore: 2,
      },
      referenceDate,
    },
    expected: {
      ageBand: "out_of_range",
      severityTier: "mild",
      pathwayKey: "clinician_review_required",
      requiresClinicianReview: true,
      urgencyLevel: "priority",
      reasonCode: "AGE_OUT_OF_RANGE",
    },
  },
];

function createAppWithDatabase() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.none(migrationSql);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return {
    app: createBackendApp(pool),
    pool,
  };
}

interface InvokeOptions {
  method: "GET" | "POST" | "PATCH";
  url: string;
  role: string;
  body?: unknown;
}

async function invoke(app: Application, options: InvokeOptions) {
  const req = createRequest({
    method: options.method,
    url: options.url,
    headers: {
      "x-role": options.role,
    },
    body: options.body,
  });
  const res = createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    res.on("end", () => resolve());
    app.handle(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
      }
    });
  });

  const rawData = res._getData();
  let parsedBody: unknown = rawData;
  if (typeof rawData === "string" && rawData.length > 0) {
    try {
      parsedBody = JSON.parse(rawData);
    } catch {
      parsedBody = rawData;
    }
  }

  return {
    statusCode: res.statusCode,
    body: parsedBody as Record<string, unknown>,
  };
}

describe("P5-Rules-Fixture-Matrix", () => {
  it("matches expected pathway outcomes and remains deterministic across fixture matrix", () => {
    for (const fixture of fixtureMatrix) {
      const first = evaluateTriageRules(fixture.input);
      const second = evaluateTriageRules(fixture.input);

      expect(first, fixture.name).toEqual(second);
      expect(first.engineVersion, fixture.name).toBe(RULE_ENGINE_VERSION);
      expect(first.ageBand, fixture.name).toBe(fixture.expected.ageBand);
      expect(first.severityTier, fixture.name).toBe(fixture.expected.severityTier);
      expect(first.pathwayKey, fixture.name).toBe(fixture.expected.pathwayKey);
      expect(first.requiresClinicianReview, fixture.name).toBe(
        fixture.expected.requiresClinicianReview,
      );
      expect(first.urgencyLevel, fixture.name).toBe(fixture.expected.urgencyLevel);
      expect(first.reasonCodes, fixture.name).toContain(fixture.expected.reasonCode);
    }
  });

  it("persists engine version on every triage decision created at submit time", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createOne = await invoke(app, {
        method: "POST",
        url: "/api/v1/intake-sessions",
        role: "caregiver",
        body: {
          routeType: "patient_portal",
          patient: {
            firstName: "Noah",
            lastName: "Rivera",
            dob: "2014-08-15",
            sexAtBirth: "male",
          },
        },
      });
      expect(createOne.statusCode).toBe(201);
      const firstSessionId = String(createOne.body.id);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${firstSessionId}/respondent`,
            role: "caregiver",
            body: {
              type: "caregiver",
              relationshipToPatient: "father",
            },
          })
        ).statusCode,
      ).toBe(200);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${firstSessionId}/safety`,
            role: "caregiver",
            body: {
              suicidalRiskFlag: false,
              violenceRiskFlag: false,
              psychosisManiaFlag: false,
            },
          })
        ).statusCode,
      ).toBe(200);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${firstSessionId}/symptoms`,
            role: "caregiver",
            body: {
              primaryFamily: "Anxiety / Worry / Panic",
              secondaryFamilies: [],
              isMixedUnclear: false,
            },
          })
        ).statusCode,
      ).toBe(200);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${firstSessionId}/functional-impact`,
            role: "caregiver",
            body: {
              homeScore: 4,
              schoolScore: 5,
              peerScore: 2,
              safetyLegalScore: 1,
            },
          })
        ).statusCode,
      ).toBe(200);

      const submitOne = await invoke(app, {
        method: "POST",
        url: `/api/v1/intake-sessions/${firstSessionId}/submit`,
        role: "caregiver",
      });
      expect(submitOne.statusCode).toBe(200);
      expect(submitOne.body.status).toBe("awaiting_review");

      const createTwo = await invoke(app, {
        method: "POST",
        url: "/api/v1/intake-sessions",
        role: "caregiver",
        body: {
          routeType: "patient_portal",
          patient: {
            firstName: "Maya",
            lastName: "Lopez",
            dob: "2011-07-02",
            sexAtBirth: "female",
          },
        },
      });
      expect(createTwo.statusCode).toBe(201);
      const secondSessionId = String(createTwo.body.id);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${secondSessionId}/respondent`,
            role: "caregiver",
            body: {
              type: "caregiver",
              relationshipToPatient: "mother",
            },
          })
        ).statusCode,
      ).toBe(200);

      expect(
        (
          await invoke(app, {
            method: "PATCH",
            url: `/api/v1/intake-sessions/${secondSessionId}/safety`,
            role: "caregiver",
            body: {
              suicidalRiskFlag: true,
              violenceRiskFlag: false,
              psychosisManiaFlag: false,
            },
          })
        ).statusCode,
      ).toBe(200);

      const submitTwo = await invoke(app, {
        method: "POST",
        url: `/api/v1/intake-sessions/${secondSessionId}/submit`,
        role: "caregiver",
      });
      expect(submitTwo.statusCode).toBe(200);
      expect(submitTwo.body.status).toBe("flagged_urgent");

      const decisionRows = await pool.query<{
        intake_session_id: string;
        urgency_level: string;
        requires_clinician_review: boolean;
        engine_version: string;
      }>(
        `
          SELECT
            intake_session_id,
            urgency_level,
            requires_clinician_review,
            engine_version
          FROM triage_decisions
          ORDER BY created_at ASC
        `,
      );

      expect(decisionRows.rows).toHaveLength(2);
      expect(decisionRows.rows[0].intake_session_id).toBe(firstSessionId);
      expect(decisionRows.rows[1].intake_session_id).toBe(secondSessionId);
      for (const row of decisionRows.rows) {
        expect(row.engine_version).toBe(RULE_ENGINE_VERSION);
      }
      expect(decisionRows.rows[0].urgency_level).toBe("priority");
      expect(decisionRows.rows[0].requires_clinician_review).toBe(true);
      expect(decisionRows.rows[1].urgency_level).toBe("urgent");
      expect(decisionRows.rows[1].requires_clinician_review).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
