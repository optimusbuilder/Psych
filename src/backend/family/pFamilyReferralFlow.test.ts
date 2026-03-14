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

const migrationFiles = [
  "../../../db/migrations/001_phase2_core_schema.sql",
  "../../../db/migrations/002_family_referral_mvp.sql",
];

function createAppWithDatabase() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  for (const relativePath of migrationFiles) {
    const sql = readFileSync(path.resolve(__dirname, relativePath), "utf8");
    db.public.none(sql);
  }
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return {
    app: createBackendApp(pool),
    pool,
  };
}

interface InvokeOptions {
  method: "GET" | "POST";
  url: string;
  body?: unknown;
}

async function invoke(app: Application, options: InvokeOptions) {
  const req = createRequest({
    method: options.method,
    url: options.url,
    headers: {
      "content-type": "application/json",
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
  const contentType = String(res.getHeader("content-type") ?? "");
  if (contentType.includes("application/pdf")) {
    return {
      statusCode: res.statusCode,
      body: Buffer.isBuffer(rawData) ? rawData : Buffer.from(String(rawData)),
      contentType,
    };
  }

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
    contentType,
  };
}

describe("P-Family-Referral-Flow", () => {
  it("creates and returns a deterministic family referral recommendation", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/family-referrals",
        body: {
          childName: "Mia",
          childAge: "12-14",
          childGender: "female",
          primaryConcerns: ["anxiety", "depression"],
          concernDescription: "Frequent worry and low mood, especially before school.",
          concernDuration: "3-6-months",
          moodChanges: "moderate",
          sleepIssues: "difficulty-falling",
          appetiteChanges: "decreased",
          socialWithdrawal: "some",
          academicImpact: "moderate",
          selfHarmThoughts: "no",
          selfHarmBehavior: "no",
          suicidalIdeation: "no",
          familyHistory: "yes",
          recentLifeChanges: "academic",
          previousTreatment: "no",
          preferredApproach: "therapy-only",
          insuranceType: "private",
        },
      });

      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.body.referralId).toBeTruthy();
      expect(createResponse.body.recommendation.specialistType).toBeTruthy();
      expect(createResponse.body.recommendation.urgencyLevel).toMatch(
        /routine|priority|urgent|immediate/,
      );
      expect(createResponse.body.recommendation.reasonCodes.length).toBeGreaterThan(0);

      const referralId = String(createResponse.body.referralId);
      const getResponse = await invoke(app, {
        method: "GET",
        url: `/api/v1/family-referrals/${referralId}`,
      });

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body.referralId).toBe(referralId);
      expect(getResponse.body.report.pdfUrl).toContain(referralId);
    } finally {
      await pool.end();
    }
  });

  it("escalates safety-positive immediate cases", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/family-referrals",
        body: {
          childName: "Noah",
          childAge: "15-17",
          childGender: "male",
          primaryConcerns: ["depression"],
          concernDescription: "Recent severe hopelessness.",
          concernDuration: "less-than-1-month",
          moodChanges: "severe",
          sleepIssues: "difficulty-staying",
          appetiteChanges: "decreased",
          socialWithdrawal: "significant",
          academicImpact: "significant",
          selfHarmThoughts: "yes",
          selfHarmBehavior: "current",
          suicidalIdeation: "yes",
          familyHistory: "unsure",
          recentLifeChanges: "loss",
          previousTreatment: "no",
          preferredApproach: "open-medication",
          insuranceType: "medicaid",
        },
      });

      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.body.status).toBe("safety_escalated");
      expect(createResponse.body.recommendation.safetyGate).toBe("immediate");
      expect(createResponse.body.recommendation.urgencyLevel).toBe("immediate");
      expect(createResponse.body.emergency.call911).toBe(true);
      expect(createResponse.body.emergency.call988).toBe(true);
    } finally {
      await pool.end();
    }
  });

  it("generates a downloadable PDF report", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/family-referrals",
        body: {
          childName: "Avery",
          childAge: "9-11",
          childGender: "non-binary",
          primaryConcerns: ["attention", "learning"],
          concernDuration: "more-than-6-months",
          moodChanges: "mild",
          sleepIssues: "normal",
          academicImpact: "significant",
          selfHarmThoughts: "no",
          suicidalIdeation: "no",
          familyHistory: "no",
          previousTreatment: "yes-helpful",
          preferredApproach: "evaluation",
        },
      });

      const referralId = String(createResponse.body.referralId);
      const pdfResponse = await invoke(app, {
        method: "GET",
        url: `/api/v1/family-referrals/${referralId}/pdf`,
      });

      expect(pdfResponse.statusCode).toBe(200);
      expect(pdfResponse.contentType).toContain("application/pdf");
      expect((pdfResponse.body as Buffer).subarray(0, 5).toString("utf8")).toBe("%PDF-");
    } finally {
      await pool.end();
    }
  });

  it("returns and stores AI explanation with fallback when API key is not present", async () => {
    const { app, pool } = createAppWithDatabase();
    try {
      const createResponse = await invoke(app, {
        method: "POST",
        url: "/api/v1/family-referrals",
        body: {
          childName: "Kai",
          childAge: "6-8",
          childGender: "male",
          primaryConcerns: ["trauma"],
          concernDuration: "1-3-months",
          moodChanges: "moderate",
          sleepIssues: "nightmares",
          academicImpact: "mild",
          selfHarmThoughts: "no",
          suicidalIdeation: "no",
          familyHistory: "no",
          previousTreatment: "no",
          preferredApproach: "therapy-only",
        },
      });
      const referralId = String(createResponse.body.referralId);

      const aiResponse = await invoke(app, {
        method: "POST",
        url: `/api/v1/family-referrals/${referralId}/ai-explain`,
        body: {},
      });

      expect(aiResponse.statusCode).toBe(200);
      expect(aiResponse.body.aiExplanation).toBeTruthy();
      expect(aiResponse.body.usedModel).toMatch(/fallback|gemini-2.5-flash/);

      const getResponse = await invoke(app, {
        method: "GET",
        url: `/api/v1/family-referrals/${referralId}`,
      });
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body.recommendation.aiExplanation).toBeTruthy();
    } finally {
      await pool.end();
    }
  });
});
