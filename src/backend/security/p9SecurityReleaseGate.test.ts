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

function createAppWithDatabase(
  options?: Parameters<typeof createBackendApp>[1],
): { app: Application; pool: { query: (sql: string) => Promise<unknown>; end: () => Promise<void> } } {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.none(migrationSql);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return {
    app: createBackendApp(pool, options),
    pool,
  };
}

interface InvokeOptions {
  method: "GET" | "POST" | "PATCH";
  url: string;
  role?: string;
  userId?: string;
  body?: unknown;
}

async function invoke(app: Application, options: InvokeOptions) {
  const headers: Record<string, string> = {};
  if (options.role) {
    headers["x-role"] = options.role;
  }
  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  const req = createRequest({
    method: options.method,
    url: options.url,
    headers,
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

async function createAwaitingReviewCaseForOrg(app: Application, linkedOrgId: string) {
  const created = await invoke(app, {
    method: "POST",
    url: "/api/v1/intake-sessions",
    role: "caregiver",
    body: {
      routeType: "patient_portal",
      patient: {
        firstName: "Mila",
        lastName: "Rivera",
        dob: "2011-04-12",
        sexAtBirth: "female",
        linkedOrgId,
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
          primaryFamily: "Anxiety / Worry / Panic / School Refusal / OCD-like",
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
          homeScore: 5,
          schoolScore: 6,
          peerScore: 4,
          safetyLegalScore: 2,
        },
      })
    ).statusCode,
  ).toBe(200);

  const submitted = await invoke(app, {
    method: "POST",
    url: `/api/v1/intake-sessions/${sessionId}/submit`,
    role: "caregiver",
  });
  expect(submitted.statusCode).toBe(200);
  expect(submitted.body.status).toBe("awaiting_review");

  return sessionId;
}

describe("P9-Security-Release-Gate", () => {
  it("denies unauthorized provider actions, enforces org boundaries, and keeps sensitive actions auditable", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      await pool.query(`
        INSERT INTO organizations (id, name, type)
        VALUES
          ('org-001', 'North Hospital', 'hospital'),
          ('org-002', 'South Hospital', 'hospital');
      `);
      await pool.query(`
        INSERT INTO users (id, name, email, role, organization_id)
        VALUES
          ('user-clin-001', 'Dr. North', 'north@cura.org', 'clinician', 'org-001'),
          ('user-clin-002', 'Dr. South', 'south@cura.org', 'clinician', 'org-002');
      `);

      const sessionId = await createAwaitingReviewCaseForOrg(app, "org-002");

      const missingProviderIdentity = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/review-queue?status=awaiting_review",
        role: "clinician",
      });
      expect(missingProviderIdentity.statusCode).toBe(401);
      expect(missingProviderIdentity.body.error).toBe("ProviderIdentityRequired");

      const wrongRole = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/review-queue?status=awaiting_review",
        role: "caregiver",
      });
      expect(wrongRole.statusCode).toBe(403);

      const crossOrgList = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/review-queue?status=awaiting_review",
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(crossOrgList.statusCode).toBe(200);
      expect(crossOrgList.body.count).toBe(0);

      const crossOrgDetail = await invoke(app, {
        method: "GET",
        url: `/api/v1/provider/cases/${sessionId}`,
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(crossOrgDetail.statusCode).toBe(403);
      expect(crossOrgDetail.body.error).toBe("Forbidden");

      const inOrgList = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/review-queue?status=awaiting_review",
        role: "clinician",
        userId: "user-clin-002",
      });
      expect(inOrgList.statusCode).toBe(200);
      expect(inOrgList.body.count).toBe(1);
      expect(inOrgList.body.cases[0].sessionId).toBe(sessionId);

      const inOrgDetail = await invoke(app, {
        method: "GET",
        url: `/api/v1/provider/cases/${sessionId}`,
        role: "clinician",
        userId: "user-clin-002",
      });
      expect(inOrgDetail.statusCode).toBe(200);

      const override = await invoke(app, {
        method: "POST",
        url: `/api/v1/provider/cases/${sessionId}/override`,
        role: "clinician",
        userId: "user-clin-002",
        body: {
          overrideApplied: true,
          finalDisposition: "Urgent child psychiatry intake scheduled",
          rationale: "Symptoms and impairment require specialist follow-up.",
          finalizeSession: true,
        },
      });
      expect(override.statusCode).toBe(200);
      expect(override.body.sessionStatus).toBe("completed");

      const audit = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${sessionId}/audit`,
        role: "clinician",
        userId: "user-clin-002",
      });
      expect(audit.statusCode).toBe(200);
      const actions = new Set(
        (audit.body.logs as Array<Record<string, unknown>>).map((row) => String(row.action)),
      );
      expect(actions.has("clinician_review_recorded")).toBe(true);
      expect(actions.has("override_applied")).toBe(true);
      expect(actions.has("disposition_finalized")).toBe(true);
    } finally {
      await pool.end();
    }
  });

  it("applies API rate limits and still serves health smoke checks", async () => {
    const { app, pool } = createAppWithDatabase({
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 2,
      },
    });

    try {
      const healthOne = await invoke(app, {
        method: "GET",
        url: "/api/v1/health",
      });
      expect(healthOne.statusCode).toBe(200);
      expect(healthOne.body.ok).toBe(true);

      const healthTwo = await invoke(app, {
        method: "GET",
        url: "/api/v1/health",
      });
      expect(healthTwo.statusCode).toBe(200);

      const healthThree = await invoke(app, {
        method: "GET",
        url: "/api/v1/health",
      });
      expect(healthThree.statusCode).toBe(429);
      expect(healthThree.body.error).toBe("RateLimitExceeded");
    } finally {
      await pool.end();
    }
  });
});
