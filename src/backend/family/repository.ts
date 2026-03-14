import {
  familyReferralSubmissionSchema,
  type FamilyReferralSubmissionInput,
} from "./contracts";
import { type FamilyRoutingOutput } from "./routing";
import { createFamilyRoutingOutputFromSubmission } from "./submissionRouting";
import { buildId } from "../intake/utils";

type QueryResultRow = Record<string, unknown>;

export interface SqlClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

export interface FamilyReferralDecisionSnapshot {
  safetyGate: "clear" | "urgent" | "immediate";
  urgencyLevel: "routine" | "priority" | "urgent" | "immediate";
  pathwayKey: string;
  specialtyTrack: string;
  specialistType: string;
  specialistDescription: string;
  rationale: string[];
  nextSteps: string[];
  instrumentPack: string[];
  reasonCodes: string[];
  engineVersion: string;
  aiExplanation: string | null;
}

export interface FamilyReferralRecord {
  referralId: string;
  status: "completed" | "safety_escalated";
  createdAt: string;
  updatedAt: string;
  intake: FamilyReferralSubmissionInput;
  decision: FamilyReferralDecisionSnapshot;
}

export interface FamilyReferralCreateResult extends FamilyReferralRecord {
  report: {
    pdfUrl: string;
  };
}

function normalizeStatus(safetyGate: FamilyReferralDecisionSnapshot["safetyGate"]) {
  return safetyGate === "immediate" ? "safety_escalated" : "completed";
}

function parseJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function decisionFromRouting(routing: FamilyRoutingOutput): FamilyReferralDecisionSnapshot {
  return {
    safetyGate: routing.rulesResult.safetyGate,
    urgencyLevel: routing.rulesResult.urgencyLevel,
    pathwayKey: routing.rulesResult.pathwayKey,
    specialtyTrack: routing.rulesResult.specialtyTrack,
    specialistType: routing.specialistType,
    specialistDescription: routing.specialistDescription,
    rationale: routing.rationale,
    nextSteps: routing.nextSteps,
    instrumentPack: routing.instrumentPack,
    reasonCodes: routing.rulesResult.reasonCodes,
    engineVersion: routing.rulesResult.engineVersion,
    aiExplanation: null,
  };
}

export class FamilyReferralRepository {
  constructor(private readonly db: SqlClient) {}

  async createReferral(input: FamilyReferralSubmissionInput): Promise<FamilyReferralCreateResult> {
    const routing = createFamilyRoutingOutputFromSubmission(input);
    const decision = decisionFromRouting(routing);
    const referralId = buildId("family-ref");
    const intakeRowId = buildId("family-intake");
    const decisionRowId = buildId("family-decision");
    const status = normalizeStatus(decision.safetyGate);

    await this.db.query("BEGIN");
    try {
      const referralResult = await this.db.query<{
        id: string;
        status: "completed" | "safety_escalated";
        created_at: string;
        updated_at: string;
      }>(
        `
          INSERT INTO family_referrals (
            id,
            status
          ) VALUES ($1,$2)
          RETURNING id, status, created_at, updated_at
        `,
        [referralId, status],
      );

      await this.db.query(
        `
          INSERT INTO family_referral_intakes (
            id,
            referral_id,
            intake_json
          ) VALUES ($1,$2,$3::jsonb)
        `,
        [intakeRowId, referralId, JSON.stringify(input)],
      );

      await this.db.query(
        `
          INSERT INTO family_referral_decisions (
            id,
            referral_id,
            safety_gate,
            urgency_level,
            pathway_key,
            specialty_track,
            specialist_type,
            specialist_description,
            rationale_json,
            next_steps_json,
            reason_codes_json,
            engine_version
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12)
        `,
        [
          decisionRowId,
          referralId,
          decision.safetyGate,
          decision.urgencyLevel,
          decision.pathwayKey,
          decision.specialtyTrack,
          decision.specialistType,
          decision.specialistDescription,
          JSON.stringify(decision.rationale),
          JSON.stringify(decision.nextSteps),
          JSON.stringify(decision.reasonCodes),
          decision.engineVersion,
        ],
      );

      await this.db.query("COMMIT");

      return {
        referralId: referralResult.rows[0].id,
        status: referralResult.rows[0].status,
        createdAt: referralResult.rows[0].created_at,
        updatedAt: referralResult.rows[0].updated_at,
        intake: input,
        decision,
        report: {
          pdfUrl: `/api/v1/family-referrals/${referralId}/pdf`,
        },
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async getReferral(referralId: string): Promise<FamilyReferralRecord | null> {
    const result = await this.db.query<{
      referral_id: string;
      status: "completed" | "safety_escalated";
      referral_created_at: string;
      referral_updated_at: string;
      intake_json: unknown;
      safety_gate: FamilyReferralDecisionSnapshot["safetyGate"];
      urgency_level: FamilyReferralDecisionSnapshot["urgencyLevel"];
      pathway_key: string | null;
      specialty_track: string | null;
      specialist_type: string;
      specialist_description: string;
      rationale_json: unknown;
      next_steps_json: unknown;
      reason_codes_json: unknown;
      engine_version: string;
      ai_explanation: string | null;
    }>(
      `
        SELECT
          fr.id AS referral_id,
          fr.status,
          fr.created_at AS referral_created_at,
          fr.updated_at AS referral_updated_at,
          fi.intake_json,
          fd.safety_gate,
          fd.urgency_level,
          fd.pathway_key,
          fd.specialty_track,
          fd.specialist_type,
          fd.specialist_description,
          fd.rationale_json,
          fd.next_steps_json,
          fd.reason_codes_json,
          fd.engine_version,
          fd.ai_explanation
        FROM family_referrals fr
        JOIN family_referral_intakes fi
          ON fi.referral_id = fr.id
        JOIN family_referral_decisions fd
          ON fd.referral_id = fr.id
        WHERE fr.id = $1
      `,
      [referralId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const intakeObject = parseJsonObject(row.intake_json);
    const intakeParse = familyReferralSubmissionSchema.safeParse(intakeObject);
    if (!intakeParse.success) {
      throw new Error("Stored family referral intake payload is invalid.");
    }
    const intake = intakeParse.data;
    const routing = createFamilyRoutingOutputFromSubmission(intake);

    return {
      referralId: row.referral_id,
      status: row.status,
      createdAt: row.referral_created_at,
      updatedAt: row.referral_updated_at,
      intake,
      decision: {
        safetyGate: row.safety_gate,
        urgencyLevel: row.urgency_level,
        pathwayKey: row.pathway_key ?? "clinician_review_required",
        specialtyTrack: row.specialty_track ?? "mixed_unclear_track",
        specialistType: row.specialist_type,
        specialistDescription: row.specialist_description,
        rationale: parseStringArray(row.rationale_json),
        nextSteps: parseStringArray(row.next_steps_json),
        instrumentPack: routing.instrumentPack,
        reasonCodes: parseStringArray(row.reason_codes_json),
        engineVersion: row.engine_version,
        aiExplanation: row.ai_explanation,
      },
    };
  }

  async saveAiExplanation(referralId: string, aiExplanation: string) {
    const result = await this.db.query<{ referral_id: string }>(
      `
        UPDATE family_referral_decisions
        SET ai_explanation = $2,
            updated_at = NOW()
        WHERE referral_id = $1
        RETURNING referral_id
      `,
      [referralId, aiExplanation],
    );
    return result.rows.length > 0;
  }

  async recordPdfGeneration(referralId: string, fileName: string) {
    const rowId = buildId("family-report");
    await this.db.query(
      `
        INSERT INTO family_referral_reports (
          id,
          referral_id,
          format,
          file_name
        ) VALUES ($1,$2,$3,$4)
      `,
      [rowId, referralId, "pdf", fileName],
    );
  }
}
