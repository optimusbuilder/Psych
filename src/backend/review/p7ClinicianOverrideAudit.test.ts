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
  userId?: string;
  body?: unknown;
}

async function invoke(app: Application, options: InvokeOptions) {
  const req = createRequest({
    method: options.method,
    url: options.url,
    headers: {
      "x-role": options.role,
      "x-user-id": options.userId ?? "",
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

async function createAwaitingReviewCase(app: Application) {
  const create = await invoke(app, {
    method: "POST",
    url: "/api/v1/intake-sessions",
    role: "caregiver",
    body: {
      routeType: "patient_portal",
      patient: {
        firstName: "Ava",
        lastName: "Stone",
        dob: "2012-03-14",
        sexAtBirth: "female",
      },
    },
  });
  expect(create.statusCode).toBe(201);
  const sessionId = String(create.body.id);

  expect(
    (
      await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/respondent`,
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
        url: `/api/v1/intake-sessions/${sessionId}/functional-impact`,
        role: "caregiver",
        body: {
          homeScore: 4,
          schoolScore: 5,
          peerScore: 3,
          safetyLegalScore: 1,
        },
      })
    ).statusCode,
  ).toBe(200);

  const submit = await invoke(app, {
    method: "POST",
    url: `/api/v1/intake-sessions/${sessionId}/submit`,
    role: "caregiver",
  });
  expect(submit.statusCode).toBe(200);
  expect(submit.body.status).toBe("awaiting_review");

  return sessionId;
}

describe("P7-Clinician-Override-Audit", () => {
  it("supports review queue, override with rationale, disposition finalization, and auditable history", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      await pool.query(`
        INSERT INTO organizations (id, name, type)
        VALUES ('org-001', 'Cura Hospital', 'hospital');
      `);
      await pool.query(`
        INSERT INTO users (id, name, email, role, organization_id)
        VALUES ('user-clin-001', 'Dr. Sarah Chen', 'sarah.chen@cura.org', 'clinician', 'org-001');
      `);

      const sessionId = await createAwaitingReviewCase(app);

      const reviewQueue = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/review-queue?status=awaiting_review",
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(reviewQueue.statusCode).toBe(200);
      expect(reviewQueue.body.count).toBe(1);
      expect(reviewQueue.body.cases[0].sessionId).toBe(sessionId);
      expect(reviewQueue.body.cases[0].latestDecision.requiresClinicianReview).toBe(true);

      const missingRationale = await invoke(app, {
        method: "POST",
        url: `/api/v1/provider/cases/${sessionId}/override`,
        role: "clinician",
        userId: "user-clin-001",
        body: {
          overrideApplied: true,
          finalDisposition: "Urgent child psychiatry intake scheduled",
          rationale: "",
          finalizeSession: true,
        },
      });
      expect(missingRationale.statusCode).toBe(400);
      expect(missingRationale.body.error).toBe("ValidationError");

      const override = await invoke(app, {
        method: "POST",
        url: `/api/v1/provider/cases/${sessionId}/override`,
        role: "clinician",
        userId: "user-clin-001",
        body: {
          overrideApplied: true,
          finalDisposition: "Urgent child psychiatry intake scheduled",
          rationale:
            "School and home impairment remained high despite initial routing, requiring expedited specialist intake.",
          finalizeSession: true,
        },
      });
      expect(override.statusCode).toBe(200);
      expect(override.body.review.overrideApplied).toBe(true);
      expect(override.body.review.finalDisposition).toContain("Urgent child psychiatry intake");
      expect(override.body.review.rationale).toContain("impairment remained high");
      expect(override.body.review.reviewerUserId).toBe("user-clin-001");
      expect(override.body.sessionStatus).toBe("completed");

      const caseDetail = await invoke(app, {
        method: "GET",
        url: `/api/v1/provider/cases/${sessionId}`,
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(caseDetail.statusCode).toBe(200);
      expect(caseDetail.body.session.status).toBe("completed");
      expect(caseDetail.body.clinicianReviews.length).toBe(1);
      expect(caseDetail.body.clinicianReviews[0].finalDisposition).toContain(
        "Urgent child psychiatry intake",
      );
      expect(caseDetail.body.clinicianReviews[0].rationale).toContain("impairment remained high");

      const actionSet = new Set(
        (caseDetail.body.auditTrail as Array<Record<string, unknown>>).map((row) =>
          String(row.action),
        ),
      );
      expect(actionSet.has("clinician_review_recorded")).toBe(true);
      expect(actionSet.has("override_applied")).toBe(true);
      expect(actionSet.has("disposition_finalized")).toBe(true);

      const auditEndpoint = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${sessionId}/audit`,
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(auditEndpoint.statusCode).toBe(200);
      expect(auditEndpoint.body.count).toBeGreaterThanOrEqual(3);
    } finally {
      await pool.end();
    }
  });
});
