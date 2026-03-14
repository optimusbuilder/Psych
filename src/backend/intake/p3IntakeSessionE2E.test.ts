// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { newDb } from "pg-mem";
import { createRequest, createResponse } from "node-mocks-http";
import type { Application } from "express";
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

  const res = createResponse({
    eventEmitter: EventEmitter,
  });

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

describe("P3-Intake-Session-E2E", () => {
  it("supports create -> step saves -> resume -> submit flow with persistent state", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/intake-sessions",
        role: "caregiver",
        body: {
          routeType: "patient_portal",
          patient: {
            firstName: "Noah",
            lastName: "Williams",
            dob: "2014-08-15",
            sexAtBirth: "male",
          },
        },
      });
      expect(createResponse.statusCode).toBe(201);

      const sessionId = String(createResponse.body.id);
      expect(sessionId).toBeTruthy();
      expect(createResponse.body.status).toBe("in_progress");

      const respondentResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/respondent`,
        role: "caregiver",
        body: {
          type: "caregiver",
          relationshipToPatient: "father",
        },
      });
      expect(respondentResponse.statusCode).toBe(200);

      const safetyResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/safety`,
        role: "caregiver",
        body: {
          suicidalRiskFlag: false,
          violenceRiskFlag: false,
          psychosisManiaFlag: false,
          notes: "No immediate risk concerns reported.",
        },
      });
      expect(safetyResponse.statusCode).toBe(200);

      const symptomResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/symptoms`,
        role: "caregiver",
        body: {
          primaryFamily: "Anxiety / Worry / Panic / School Refusal / OCD-like",
          secondaryFamilies: ["Mood / Depression / Irritability"],
          isMixedUnclear: false,
        },
      });
      expect(symptomResponse.statusCode).toBe(200);

      const impactResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/functional-impact`,
        role: "caregiver",
        body: {
          homeScore: 4,
          schoolScore: 8,
          peerScore: 6,
          safetyLegalScore: 2,
        },
      });
      expect(impactResponse.statusCode).toBe(200);

      const resumeResponse = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${sessionId}`,
        role: "caregiver",
      });
      expect(resumeResponse.statusCode).toBe(200);

      expect(resumeResponse.body.session.id).toBe(sessionId);
      expect(resumeResponse.body.respondent.type).toBe("caregiver");
      expect(resumeResponse.body.safetyAssessment.suicidalRiskFlag).toBe(false);
      expect(resumeResponse.body.symptomAssessment.primaryFamily).toContain("Anxiety");
      expect(resumeResponse.body.functionalImpact.schoolScore).toBe(8);

      const submitResponse = await invoke(app, {
        method: "POST",
        url: `/api/v1/intake-sessions/${sessionId}/submit`,
        role: "caregiver",
      });
      expect(submitResponse.statusCode).toBe(200);

      expect(submitResponse.body.submitted).toBe(true);
      expect(submitResponse.body.status).toBe("awaiting_review");
      expect(submitResponse.body.submittedAt).toBeTruthy();

      const postSubmitResponse = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${sessionId}`,
        role: "caregiver",
      });
      expect(postSubmitResponse.statusCode).toBe(200);

      expect(postSubmitResponse.body.session.status).toBe("awaiting_review");
      expect(postSubmitResponse.body.session.submittedAt).toBeTruthy();
    } finally {
      await pool.end();
    }
  });

  it("rejects write access for disallowed role", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/intake-sessions",
        role: "caregiver",
        body: {
          routeType: "patient_portal",
          patient: {
            firstName: "Ava",
            lastName: "Chen",
            dob: "2010-05-14",
            sexAtBirth: "female",
          },
        },
      });
      expect(createResponse.statusCode).toBe(201);

      const sessionId = String(createResponse.body.id);

      const deniedResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/safety`,
        role: "clinician",
        body: {
          suicidalRiskFlag: false,
          violenceRiskFlag: false,
          psychosisManiaFlag: false,
        },
      });
      expect(deniedResponse.statusCode).toBe(403);
    } finally {
      await pool.end();
    }
  });
});
