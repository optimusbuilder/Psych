import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationSql = readFileSync(
  path.resolve(__dirname, "../../../db/migrations/001_phase2_core_schema.sql"),
  "utf8",
);
const seedSql = readFileSync(
  path.resolve(__dirname, "../../../db/seeds/001_phase2_seed.sql"),
  "utf8",
);

function createDatabase() {
  return newDb({ autoCreateForeignKeyIndices: true });
}

const requiredTables = [
  "organizations",
  "users",
  "patients",
  "respondents",
  "intake_sessions",
  "safety_assessments",
  "symptom_family_assessments",
  "functional_impairment_scores",
  "instrument_assignments",
  "instrument_results",
  "triage_decisions",
  "clinician_reviews",
  "audit_logs",
];

describe("P2-DB-Migration-Integrity", () => {
  it("applies schema migration on an empty database and creates all required tables", () => {
    const db = createDatabase();
    db.public.none(migrationSql);

    const rows = db.public.many(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `) as Array<{ table_name: string }>;

    const tableSet = new Set(rows.map((row) => row.table_name));
    for (const tableName of requiredTables) {
      expect(tableSet.has(tableName)).toBe(true);
    }
  });

  it("enforces foreign-key constraints after migration", () => {
    const db = createDatabase();
    db.public.none(migrationSql);

    expect(() => {
      db.public.none(`
        INSERT INTO intake_sessions (
          id,
          patient_id,
          route_type,
          started_by_user_id,
          status
        )
        VALUES (
          'session-orphan',
          'patient-missing',
          'patient_portal',
          NULL,
          'in_progress'
        );
      `);
    }).toThrow();
  });

  it("loads seed data and supports end-to-end join from session to review", () => {
    const db = createDatabase();
    db.public.none(migrationSql);
    db.public.none(seedSql);

    const row = db.public.one(`
      SELECT
        s.id AS session_id,
        sa.requires_immediate_review,
        td.recommendation,
        cr.final_disposition
      FROM intake_sessions s
      JOIN safety_assessments sa
        ON sa.intake_session_id = s.id
      JOIN triage_decisions td
        ON td.intake_session_id = s.id
      JOIN clinician_reviews cr
        ON cr.intake_session_id = s.id
      WHERE s.id = 'session-001'
    `) as {
      session_id: string;
      requires_immediate_review: boolean;
      recommendation: string;
      final_disposition: string;
    };

    expect(row.session_id).toBe("session-001");
    expect(row.requires_immediate_review).toBe(true);
    expect(row.recommendation).toContain("Urgent psychiatric evaluation");
    expect(row.final_disposition).toContain("Urgent child psychiatry intake");
  });
});
