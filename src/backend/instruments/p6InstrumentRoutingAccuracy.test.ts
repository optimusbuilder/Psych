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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationSql = readFileSync(
  path.resolve(__dirname, "../../../db/migrations/001_phase2_core_schema.sql"),
  "utf8",
);

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

interface CaseInput {
  firstName: string;
  lastName: string;
  dob: string;
  symptomFamily: string;
  scores: {
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
  };
}

async function createSubmittedCase(app: Application, input: CaseInput) {
  const created = await invoke(app, {
    method: "POST",
    url: "/api/v1/intake-sessions",
    role: "caregiver",
    body: {
      routeType: "patient_portal",
      patient: {
        firstName: input.firstName,
        lastName: input.lastName,
        dob: input.dob,
        sexAtBirth: "unknown",
      },
    },
  });
  expect(created.statusCode).toBe(201);
  const sessionId = String(created.body.id);

  expect(
    (
      await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/respondent`,
        role: "caregiver",
        body: {
          type: "caregiver",
          relationshipToPatient: "parent",
        },
      })
    ).statusCode,
  ).toBe(200);

  expect(
    (
      await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/safety`,
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
        url: `/api/v1/intake-sessions/${sessionId}/symptoms`,
        role: "caregiver",
        body: {
          primaryFamily: input.symptomFamily,
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
        url: `/api/v1/intake-sessions/${sessionId}/functional-impact`,
        role: "caregiver",
        body: input.scores,
      })
    ).statusCode,
  ).toBe(200);

  const submitted = await invoke(app, {
    method: "POST",
    url: `/api/v1/intake-sessions/${sessionId}/submit`,
    role: "caregiver",
  });
  expect(submitted.statusCode).toBe(200);

  return {
    sessionId,
    submitStatus: String(submitted.body.status),
  };
}

function assignmentKeySet(assignments: Array<Record<string, unknown>>) {
  return new Set(
    assignments.map(
      (assignment) => `${String(assignment.instrumentName)}::${String(assignment.assignedTo)}`,
    ),
  );
}

describe("P6-Instrument-Routing-Accuracy", () => {
  it("assigns expected instruments for representative symptom families", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const fixtures = [
        {
          input: {
            firstName: "Ari",
            lastName: "Nguyen",
            dob: "2015-02-20",
            symptomFamily: "Anxiety / Worry / Panic",
            scores: { homeScore: 4, schoolScore: 5, peerScore: 3, safetyLegalScore: 1 },
          },
          expected: ["PSC-17::caregiver", "SCARED::caregiver"],
        },
        {
          input: {
            firstName: "Mia",
            lastName: "Brown",
            dob: "2010-03-01",
            symptomFamily: "Mood / Depression / Irritability",
            scores: { homeScore: 5, schoolScore: 8, peerScore: 6, safetyLegalScore: 2 },
          },
          expected: ["PSC-17::caregiver", "PHQ-A::patient", "ASQ::patient"],
        },
        {
          input: {
            firstName: "Ezra",
            lastName: "Lee",
            dob: "2014-07-10",
            symptomFamily: "ADHD / Attention / Hyperactivity",
            scores: { homeScore: 2, schoolScore: 3, peerScore: 2, safetyLegalScore: 1 },
          },
          expected: [
            "PSC-17::caregiver",
            "Vanderbilt::caregiver",
            "Vanderbilt::teacher",
          ],
        },
        {
          input: {
            firstName: "Owen",
            lastName: "Patel",
            dob: "2021-06-12",
            symptomFamily: "Autism / Developmental / Social Communication",
            scores: { homeScore: 2, schoolScore: 2, peerScore: 3, safetyLegalScore: 0 },
          },
          expected: ["SWYC::caregiver", "M-CHAT-R/F::caregiver", "SWYC POSI::caregiver"],
        },
        {
          input: {
            firstName: "Liam",
            lastName: "Ortiz",
            dob: "2009-09-09",
            symptomFamily: "Substance Use",
            scores: { homeScore: 2, schoolScore: 2, peerScore: 2, safetyLegalScore: 2 },
          },
          expected: ["PSC-17::caregiver", "CRAFFT::patient"],
        },
      ];

      for (const fixture of fixtures) {
        const session = await createSubmittedCase(app, fixture.input);
        const routed = await invoke(app, {
          method: "POST",
          url: `/api/v1/intake-sessions/${session.sessionId}/instruments/route`,
          role: "caregiver",
        });
        expect(routed.statusCode, fixture.input.symptomFamily).toBe(200);

        const assignments = routed.body.assignments as Array<Record<string, unknown>>;
        const keySet = assignmentKeySet(assignments);
        expect(keySet, fixture.input.symptomFamily).toEqual(new Set(fixture.expected));
      }
    } finally {
      await pool.end();
    }
  });

  it("enforces assignment status transitions and interprets near/above cutoff scores", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const moodCase = await createSubmittedCase(app, {
        firstName: "Zoe",
        lastName: "Price",
        dob: "2010-01-20",
        symptomFamily: "Mood / Depression / Irritability",
        scores: { homeScore: 4, schoolScore: 5, peerScore: 4, safetyLegalScore: 1 },
      });
      expect(moodCase.submitStatus).toBe("awaiting_instruments");

      const moodRouted = await invoke(app, {
        method: "POST",
        url: `/api/v1/intake-sessions/${moodCase.sessionId}/instruments/route`,
        role: "caregiver",
      });
      expect(moodRouted.statusCode).toBe(200);
      const moodAssignments = moodRouted.body.assignments as Array<Record<string, unknown>>;
      const phqAssignment = moodAssignments.find(
        (assignment) => assignment.instrumentName === "PHQ-A",
      );
      expect(phqAssignment).toBeTruthy();
      expect(phqAssignment?.status).toBe("assigned");
      const phqId = String(phqAssignment?.id);

      const rejectPrematureScore = await invoke(app, {
        method: "POST",
        url: `/api/v1/instrument-assignments/${phqId}/score`,
        role: "caregiver",
        body: { rawScore: 9 },
      });
      expect(rejectPrematureScore.statusCode).toBe(409);
      expect(rejectPrematureScore.body.error).toBe("AssignmentMustBeCompleted");

      const completedPhq = await invoke(app, {
        method: "POST",
        url: `/api/v1/instrument-assignments/${phqId}/complete`,
        role: "caregiver",
      });
      expect(completedPhq.statusCode).toBe(200);
      expect(completedPhq.body.assignment.status).toBe("completed");

      const scoredPhq = await invoke(app, {
        method: "POST",
        url: `/api/v1/instrument-assignments/${phqId}/score`,
        role: "caregiver",
        body: { rawScore: 9 },
      });
      expect(scoredPhq.statusCode).toBe(200);
      expect(scoredPhq.body.status).toBe("scored");
      expect(scoredPhq.body.cutoffTriggered).toBe(false);
      expect(scoredPhq.body.decisionUpdated).toBe(false);

      const substanceCase = await createSubmittedCase(app, {
        firstName: "Nora",
        lastName: "Stone",
        dob: "2009-04-04",
        symptomFamily: "Substance Use",
        scores: { homeScore: 2, schoolScore: 2, peerScore: 2, safetyLegalScore: 2 },
      });
      expect(substanceCase.submitStatus).toBe("awaiting_instruments");

      const substanceRouted = await invoke(app, {
        method: "POST",
        url: `/api/v1/intake-sessions/${substanceCase.sessionId}/instruments/route`,
        role: "caregiver",
      });
      expect(substanceRouted.statusCode).toBe(200);

      const substanceAssignments =
        substanceRouted.body.assignments as Array<Record<string, unknown>>;
      const crafftAssignment = substanceAssignments.find(
        (assignment) => assignment.instrumentName === "CRAFFT",
      );
      expect(crafftAssignment).toBeTruthy();
      expect(crafftAssignment?.status).toBe("assigned");
      const crafftId = String(crafftAssignment?.id);

      const completedCrafft = await invoke(app, {
        method: "POST",
        url: `/api/v1/instrument-assignments/${crafftId}/complete`,
        role: "caregiver",
      });
      expect(completedCrafft.statusCode).toBe(200);
      expect(completedCrafft.body.assignment.status).toBe("completed");

      const scoredCrafft = await invoke(app, {
        method: "POST",
        url: `/api/v1/instrument-assignments/${crafftId}/score`,
        role: "caregiver",
        body: { rawScore: 3 },
      });
      expect(scoredCrafft.statusCode).toBe(200);
      expect(scoredCrafft.body.status).toBe("scored");
      expect(scoredCrafft.body.cutoffTriggered).toBe(true);
      expect(scoredCrafft.body.decisionUpdated).toBe(true);
      expect(scoredCrafft.body.decisionUpdate.engineVersion).toBe("instrument-v1.0.0");
      expect(scoredCrafft.body.decisionUpdate.requiresClinicianReview).toBe(true);

      const sessionAfterCutoff = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${substanceCase.sessionId}`,
        role: "caregiver",
      });
      expect(sessionAfterCutoff.statusCode).toBe(200);
      expect(sessionAfterCutoff.body.session.status).toBe("awaiting_review");

      const decisionRows = await pool.query<{
        engine_version: string;
        recommendation: string;
        urgency_level: string;
      }>(
        `
          SELECT engine_version, recommendation, urgency_level
          FROM triage_decisions
          WHERE intake_session_id = $1
          ORDER BY created_at DESC
        `,
        [substanceCase.sessionId],
      );
      expect(decisionRows.rows.length).toBeGreaterThanOrEqual(2);
      expect(decisionRows.rows[0].engine_version).toBe("instrument-v1.0.0");
      expect(decisionRows.rows[0].recommendation).toContain("CRAFFT exceeded cutoff");
      expect(["priority", "urgent", "immediate"]).toContain(decisionRows.rows[0].urgency_level);
    } finally {
      await pool.end();
    }
  });
});
