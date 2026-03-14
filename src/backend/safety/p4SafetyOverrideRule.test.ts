// @vitest-environment node

import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Application } from "express";
import { newDb } from "pg-mem";
import { createRequest, createResponse } from "node-mocks-http";
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

describe("P4-Safety-Override-Rule", () => {
  it("flags urgent safety cases, suspends normal routing, and records audit trail", async () => {
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

      const safetyResponse = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/safety`,
        role: "caregiver",
        userId: "user-intake-001",
        body: {
          suicidalRiskFlag: true,
          violenceRiskFlag: false,
          psychosisManiaFlag: false,
          notes: "Patient endorsed suicidal thoughts.",
        },
      });

      expect(safetyResponse.statusCode).toBe(200);
      expect(safetyResponse.body.escalationLevel).toBe("urgent");
      expect(safetyResponse.body.requiresImmediateReview).toBe(true);
      expect(safetyResponse.body.autoRoutingSuspended).toBe(true);
      expect(safetyResponse.body.sessionStatus).toBe("flagged_urgent");

      const blockedSymptoms = await invoke(app, {
        method: "PATCH",
        url: `/api/v1/intake-sessions/${sessionId}/symptoms`,
        role: "caregiver",
        body: {
          primaryFamily: "Mood / Depression / Irritability",
          secondaryFamilies: ["Anxiety / Worry / Panic / School Refusal / OCD-like"],
          isMixedUnclear: false,
        },
      });
      expect(blockedSymptoms.statusCode).toBe(409);
      expect(blockedSymptoms.body.error).toBe("AutoRoutingSuspended");

      const urgentQueue = await invoke(app, {
        method: "GET",
        url: "/api/v1/provider/urgent-cases",
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(urgentQueue.statusCode).toBe(200);
      expect(urgentQueue.body.count).toBe(1);
      expect(urgentQueue.body.cases[0].sessionId).toBe(sessionId);
      expect(urgentQueue.body.cases[0].escalationLevel).toBe("urgent");

      const auditLogs = await invoke(app, {
        method: "GET",
        url: `/api/v1/intake-sessions/${sessionId}/audit`,
        role: "clinician",
        userId: "user-clin-001",
      });
      expect(auditLogs.statusCode).toBe(200);
      expect(auditLogs.body.count).toBeGreaterThan(0);
      expect(auditLogs.body.logs[0].action).toBe("safety_flagged");
      expect(auditLogs.body.logs[0].entityId).toBe(sessionId);
      expect(auditLogs.body.logs[0].timestamp).toBeTruthy();
      expect(auditLogs.body.logs[0].metadataJson.reasonCodes).toContain("SUICIDAL_RISK");
    } finally {
      await pool.end();
    }
  });
});
