import type {
  CreateSessionInput,
  FunctionalImpactInput,
  RespondentInput,
  SafetyInput,
  SymptomInput,
} from "./contracts";
import { buildId, computeOverallSeverity } from "./utils";
import { evaluateSafety } from "../safety/service";
import { evaluateTriageRules, rulesInputFromAggregate } from "../rules/engine";

type QueryResultRow = Record<string, unknown>;

export interface SqlClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

interface SessionRecord {
  id: string;
  patient_id: string;
  route_type: string;
  started_by_user_id: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

interface PatientRecord {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  sex_at_birth: string | null;
  guardian_contact: string | null;
  hospital_mrn: string | null;
  linked_org_id: string | null;
}

export interface IntakeSessionAggregate {
  session: {
    id: string;
    patientId: string;
    routeType: string;
    startedByUserId: string | null;
    status: string;
    createdAt: string;
    submittedAt: string | null;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    sexAtBirth: string | null;
    guardianContact: string | null;
    hospitalMrn: string | null;
    linkedOrgId: string | null;
  };
  respondent: {
    id: string;
    type: string;
    relationshipToPatient: string | null;
    ageIfPatient: number | null;
  } | null;
  safetyAssessment: {
    id: string;
    suicidalRiskFlag: boolean;
    violenceRiskFlag: boolean;
    psychosisManiaFlag: boolean;
    escalationLevel: string;
    requiresImmediateReview: boolean;
    notes: string | null;
  } | null;
  symptomAssessment: {
    id: string;
    primaryFamily: string;
    secondaryFamilies: string[];
    isMixedUnclear: boolean;
  } | null;
  functionalImpact: {
    id: string;
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
    overallSeverity: string;
  } | null;
}

export interface SafetyGateState {
  hasSafetyAssessment: boolean;
  requiresImmediateReview: boolean;
  escalationLevel: string | null;
}

export interface UrgentCaseRow {
  sessionId: string;
  patientId: string;
  patientName: string;
  routeType: string;
  status: string;
  escalationLevel: string;
  suicidalRiskFlag: boolean;
  violenceRiskFlag: boolean;
  psychosisManiaFlag: boolean;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  timestamp: string;
  metadataJson: unknown;
}

export class IntakeRepository {
  constructor(private readonly db: SqlClient) {}

  async createSession(input: CreateSessionInput) {
    const patientId = buildId("patient");
    const sessionId = buildId("session");

    await this.db.query("BEGIN");
    try {
      await this.db.query(
        `
          INSERT INTO patients (
            id,
            first_name,
            last_name,
            dob,
            sex_at_birth,
            guardian_contact,
            hospital_mrn,
            linked_org_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          patientId,
          input.patient.firstName,
          input.patient.lastName,
          input.patient.dob,
          input.patient.sexAtBirth ?? null,
          input.patient.guardianContact ?? null,
          input.patient.hospitalMrn ?? null,
          input.patient.linkedOrgId ?? null,
        ],
      );

      await this.db.query(
        `
          INSERT INTO intake_sessions (
            id,
            patient_id,
            route_type,
            started_by_user_id,
            status
          ) VALUES ($1,$2,$3,$4,$5)
        `,
        [sessionId, patientId, input.routeType, input.startedByUserId ?? null, "in_progress"],
      );

      await this.db.query("COMMIT");
      return {
        id: sessionId,
        patientId,
        routeType: input.routeType,
        status: "in_progress",
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async ensureSessionExists(sessionId: string) {
    const result = await this.db.query<{ id: string }>(
      "SELECT id FROM intake_sessions WHERE id = $1",
      [sessionId],
    );
    return result.rows.length > 0;
  }

  async saveRespondent(sessionId: string, input: RespondentInput) {
    await this.db.query("BEGIN");
    try {
      await this.db.query("DELETE FROM respondents WHERE intake_session_id = $1", [sessionId]);
      const respondentId = buildId("respondent");
      await this.db.query(
        `
          INSERT INTO respondents (
            id,
            intake_session_id,
            type,
            relationship_to_patient,
            age_if_patient
          ) VALUES ($1,$2,$3,$4,$5)
        `,
        [
          respondentId,
          sessionId,
          input.type,
          input.relationshipToPatient ?? null,
          input.ageIfPatient ?? null,
        ],
      );
      await this.db.query("COMMIT");
      return { id: respondentId };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async saveSafety(sessionId: string, input: SafetyInput, actorUserId: string | null = null) {
    const evaluation = evaluateSafety(input);

    await this.db.query("BEGIN");
    try {
      const safetyId = buildId("safety");
      const safetyResult = await this.db.query<{ id: string }>(
        `
          INSERT INTO safety_assessments (
            id,
            intake_session_id,
            suicidal_risk_flag,
            violence_risk_flag,
            psychosis_mania_flag,
            escalation_level,
            requires_immediate_review,
            notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (intake_session_id)
          DO UPDATE SET
            suicidal_risk_flag = EXCLUDED.suicidal_risk_flag,
            violence_risk_flag = EXCLUDED.violence_risk_flag,
            psychosis_mania_flag = EXCLUDED.psychosis_mania_flag,
            escalation_level = EXCLUDED.escalation_level,
            requires_immediate_review = EXCLUDED.requires_immediate_review,
            notes = EXCLUDED.notes
          RETURNING id
        `,
        [
          safetyId,
          sessionId,
          input.suicidalRiskFlag,
          input.violenceRiskFlag,
          input.psychosisManiaFlag,
          evaluation.escalationLevel,
          evaluation.requiresImmediateReview,
          input.notes ?? null,
        ],
      );

      const statusUpdate = await this.db.query<{ status: string }>(
        `
          UPDATE intake_sessions
          SET status = CASE
            WHEN $2::boolean = TRUE THEN 'flagged_urgent'
            WHEN status = 'flagged_urgent' AND submitted_at IS NULL THEN 'in_progress'
            ELSE status
          END
          WHERE id = $1
          RETURNING status
        `,
        [sessionId, evaluation.requiresImmediateReview],
      );

      if (evaluation.requiresImmediateReview) {
        let actorIdForAudit: string | null = actorUserId;
        if (actorUserId) {
          const actorLookup = await this.db.query<{ id: string }>(
            "SELECT id FROM users WHERE id = $1",
            [actorUserId],
          );
          actorIdForAudit = actorLookup.rows.length > 0 ? actorUserId : null;
        }

        await this.db.query(
          `
            INSERT INTO audit_logs (
              id,
              entity_type,
              entity_id,
              action,
              actor_user_id,
              metadata_json
            ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
          `,
          [
            buildId("audit"),
            "intake_session",
            sessionId,
            "safety_flagged",
            actorIdForAudit,
            JSON.stringify({
              escalationLevel: evaluation.escalationLevel,
              reasonCodes: evaluation.reasonCodes,
            }),
          ],
        );
      }

      await this.db.query("COMMIT");

      return {
        id: safetyResult.rows[0].id,
        escalationLevel: evaluation.escalationLevel,
        requiresImmediateReview: evaluation.requiresImmediateReview,
        autoRoutingSuspended: evaluation.autoRoutingSuspended,
        reasonCodes: evaluation.reasonCodes,
        sessionStatus: statusUpdate.rows[0]?.status ?? "in_progress",
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async getSafetyGateState(sessionId: string): Promise<SafetyGateState> {
    const result = await this.db.query<{
      requires_immediate_review: boolean;
      escalation_level: string;
    }>(
      `
        SELECT requires_immediate_review, escalation_level
        FROM safety_assessments
        WHERE intake_session_id = $1
      `,
      [sessionId],
    );

    if (result.rows.length === 0) {
      return {
        hasSafetyAssessment: false,
        requiresImmediateReview: false,
        escalationLevel: null,
      };
    }

    return {
      hasSafetyAssessment: true,
      requiresImmediateReview: result.rows[0].requires_immediate_review,
      escalationLevel: result.rows[0].escalation_level,
    };
  }

  async saveSymptoms(sessionId: string, input: SymptomInput) {
    const symptomId = buildId("symptom");
    const result = await this.db.query<{ id: string }>(
      `
        INSERT INTO symptom_family_assessments (
          id,
          intake_session_id,
          primary_family,
          secondary_families_json,
          is_mixed_unclear
        ) VALUES ($1,$2,$3,$4::jsonb,$5)
        ON CONFLICT (intake_session_id)
        DO UPDATE SET
          primary_family = EXCLUDED.primary_family,
          secondary_families_json = EXCLUDED.secondary_families_json,
          is_mixed_unclear = EXCLUDED.is_mixed_unclear
        RETURNING id
      `,
      [
        symptomId,
        sessionId,
        input.primaryFamily,
        JSON.stringify(input.secondaryFamilies ?? []),
        input.isMixedUnclear ?? false,
      ],
    );
    return { id: result.rows[0].id };
  }

  async saveFunctionalImpact(sessionId: string, input: FunctionalImpactInput) {
    const overallSeverity = computeOverallSeverity(input);
    const impactId = buildId("impact");

    const result = await this.db.query<{ id: string }>(
      `
        INSERT INTO functional_impairment_scores (
          id,
          intake_session_id,
          home_score,
          school_score,
          peer_score,
          safety_legal_score,
          overall_severity
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (intake_session_id)
        DO UPDATE SET
          home_score = EXCLUDED.home_score,
          school_score = EXCLUDED.school_score,
          peer_score = EXCLUDED.peer_score,
          safety_legal_score = EXCLUDED.safety_legal_score,
          overall_severity = EXCLUDED.overall_severity
        RETURNING id
      `,
      [
        impactId,
        sessionId,
        input.homeScore,
        input.schoolScore,
        input.peerScore,
        input.safetyLegalScore,
        overallSeverity,
      ],
    );
    return { id: result.rows[0].id, overallSeverity };
  }

  async getSessionAggregate(sessionId: string): Promise<IntakeSessionAggregate | null> {
    const sessionResult = await this.db.query<SessionRecord>(
      "SELECT * FROM intake_sessions WHERE id = $1",
      [sessionId],
    );
    if (sessionResult.rows.length === 0) {
      return null;
    }
    const session = sessionResult.rows[0];

    const patientResult = await this.db.query<PatientRecord>(
      "SELECT * FROM patients WHERE id = $1",
      [session.patient_id],
    );
    const patient = patientResult.rows[0];

    const respondentResult = await this.db.query<{
      id: string;
      type: string;
      relationship_to_patient: string | null;
      age_if_patient: number | null;
    }>(
      `
        SELECT id, type, relationship_to_patient, age_if_patient
        FROM respondents
        WHERE intake_session_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [sessionId],
    );

    const safetyResult = await this.db.query<{
      id: string;
      suicidal_risk_flag: boolean;
      violence_risk_flag: boolean;
      psychosis_mania_flag: boolean;
      escalation_level: string;
      requires_immediate_review: boolean;
      notes: string | null;
    }>(
      `
        SELECT
          id,
          suicidal_risk_flag,
          violence_risk_flag,
          psychosis_mania_flag,
          escalation_level,
          requires_immediate_review,
          notes
        FROM safety_assessments
        WHERE intake_session_id = $1
      `,
      [sessionId],
    );

    const symptomResult = await this.db.query<{
      id: string;
      primary_family: string;
      secondary_families_json: string[] | null;
      is_mixed_unclear: boolean;
    }>(
      `
        SELECT
          id,
          primary_family,
          secondary_families_json,
          is_mixed_unclear
        FROM symptom_family_assessments
        WHERE intake_session_id = $1
      `,
      [sessionId],
    );

    const functionalResult = await this.db.query<{
      id: string;
      home_score: number;
      school_score: number;
      peer_score: number;
      safety_legal_score: number;
      overall_severity: string;
    }>(
      `
        SELECT
          id,
          home_score,
          school_score,
          peer_score,
          safety_legal_score,
          overall_severity
        FROM functional_impairment_scores
        WHERE intake_session_id = $1
      `,
      [sessionId],
    );

    return {
      session: {
        id: session.id,
        patientId: session.patient_id,
        routeType: session.route_type,
        startedByUserId: session.started_by_user_id,
        status: session.status,
        createdAt: session.created_at,
        submittedAt: session.submitted_at,
      },
      patient: {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dob: patient.dob,
        sexAtBirth: patient.sex_at_birth,
        guardianContact: patient.guardian_contact,
        hospitalMrn: patient.hospital_mrn,
        linkedOrgId: patient.linked_org_id,
      },
      respondent:
        respondentResult.rows.length > 0
          ? {
              id: respondentResult.rows[0].id,
              type: respondentResult.rows[0].type,
              relationshipToPatient: respondentResult.rows[0].relationship_to_patient,
              ageIfPatient: respondentResult.rows[0].age_if_patient,
            }
          : null,
      safetyAssessment:
        safetyResult.rows.length > 0
          ? {
              id: safetyResult.rows[0].id,
              suicidalRiskFlag: safetyResult.rows[0].suicidal_risk_flag,
              violenceRiskFlag: safetyResult.rows[0].violence_risk_flag,
              psychosisManiaFlag: safetyResult.rows[0].psychosis_mania_flag,
              escalationLevel: safetyResult.rows[0].escalation_level,
              requiresImmediateReview: safetyResult.rows[0].requires_immediate_review,
              notes: safetyResult.rows[0].notes,
            }
          : null,
      symptomAssessment:
        symptomResult.rows.length > 0
          ? {
              id: symptomResult.rows[0].id,
              primaryFamily: symptomResult.rows[0].primary_family,
              secondaryFamilies: symptomResult.rows[0].secondary_families_json ?? [],
              isMixedUnclear: symptomResult.rows[0].is_mixed_unclear,
            }
          : null,
      functionalImpact:
        functionalResult.rows.length > 0
          ? {
              id: functionalResult.rows[0].id,
              homeScore: functionalResult.rows[0].home_score,
              schoolScore: functionalResult.rows[0].school_score,
              peerScore: functionalResult.rows[0].peer_score,
              safetyLegalScore: functionalResult.rows[0].safety_legal_score,
              overallSeverity: functionalResult.rows[0].overall_severity,
            }
          : null,
    };
  }

  async submitSession(sessionId: string) {
    const aggregate = await this.getSessionAggregate(sessionId);
    if (!aggregate) {
      return null;
    }

    const missing: string[] = [];
    if (!aggregate.respondent) {
      missing.push("respondent");
    }
    if (!aggregate.safetyAssessment) {
      missing.push("safetyAssessment");
    }
    const safetyPositive = aggregate.safetyAssessment?.requiresImmediateReview === true;
    if (!safetyPositive) {
      if (!aggregate.symptomAssessment) {
        missing.push("symptomAssessment");
      }
      if (!aggregate.functionalImpact) {
        missing.push("functionalImpact");
      }
    }

    if (missing.length > 0) {
      return {
        submitted: false as const,
        missing,
      };
    }

    const decision = evaluateTriageRules(rulesInputFromAggregate(aggregate));

    let nextStatus = "awaiting_instruments";
    if (decision.pathwayKey === "immediate_urgent_review" || decision.urgencyLevel === "immediate") {
      nextStatus = "flagged_urgent";
    } else if (decision.requiresClinicianReview) {
      nextStatus = "awaiting_review";
    }

    await this.db.query("BEGIN");
    try {
      const decisionId = buildId("decision");
      const decisionInsert = await this.db.query<{
        id: string;
        recommendation: string;
        requires_clinician_review: boolean;
        urgency_level: string;
        engine_version: string;
        created_at: string;
      }>(
        `
          INSERT INTO triage_decisions (
            id,
            intake_session_id,
            recommendation,
            requires_clinician_review,
            urgency_level,
            engine_version
          ) VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING
            id,
            recommendation,
            requires_clinician_review,
            urgency_level,
            engine_version,
            created_at
        `,
        [
          decisionId,
          sessionId,
          decision.recommendation,
          decision.requiresClinicianReview,
          decision.urgencyLevel,
          decision.engineVersion,
        ],
      );

      const statusResult = await this.db.query<{ status: string; submitted_at: string }>(
        `
          UPDATE intake_sessions
          SET status = $2, submitted_at = NOW()
          WHERE id = $1
          RETURNING status, submitted_at
        `,
        [sessionId, nextStatus],
      );

      await this.db.query("COMMIT");

      return {
        submitted: true as const,
        status: statusResult.rows[0].status,
        submittedAt: statusResult.rows[0].submitted_at,
        decision: {
          id: decisionInsert.rows[0].id,
          recommendation: decisionInsert.rows[0].recommendation,
          requiresClinicianReview: decisionInsert.rows[0].requires_clinician_review,
          urgencyLevel: decisionInsert.rows[0].urgency_level,
          engineVersion: decisionInsert.rows[0].engine_version,
          createdAt: decisionInsert.rows[0].created_at,
          pathwayKey: decision.pathwayKey,
          reasonCodes: decision.reasonCodes,
        },
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async listUrgentCases(limit = 25): Promise<UrgentCaseRow[]> {
    const result = await this.db.query<{
      session_id: string;
      patient_id: string;
      first_name: string;
      last_name: string;
      route_type: string;
      status: string;
      escalation_level: string;
      suicidal_risk_flag: boolean;
      violence_risk_flag: boolean;
      psychosis_mania_flag: boolean;
      created_at: string;
    }>(
      `
        SELECT
          s.id AS session_id,
          s.patient_id,
          p.first_name,
          p.last_name,
          s.route_type,
          s.status,
          sa.escalation_level,
          sa.suicidal_risk_flag,
          sa.violence_risk_flag,
          sa.psychosis_mania_flag,
          s.created_at
        FROM intake_sessions s
        JOIN patients p
          ON p.id = s.patient_id
        JOIN safety_assessments sa
          ON sa.intake_session_id = s.id
        WHERE s.status = 'flagged_urgent'
        ORDER BY s.created_at DESC
        LIMIT $1
      `,
      [limit],
    );

    return result.rows.map((row) => ({
      sessionId: row.session_id,
      patientId: row.patient_id,
      patientName: `${row.first_name} ${row.last_name}`,
      routeType: row.route_type,
      status: row.status,
      escalationLevel: row.escalation_level,
      suicidalRiskFlag: row.suicidal_risk_flag,
      violenceRiskFlag: row.violence_risk_flag,
      psychosisManiaFlag: row.psychosis_mania_flag,
      createdAt: row.created_at,
    }));
  }

  async listAuditLogsForSession(sessionId: string): Promise<AuditLogRow[]> {
    const result = await this.db.query<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      actor_user_id: string | null;
      timestamp: string;
      metadata_json: unknown;
    }>(
      `
        SELECT
          id,
          entity_type,
          entity_id,
          action,
          actor_user_id,
          timestamp,
          metadata_json
        FROM audit_logs
        WHERE entity_type = 'intake_session' AND entity_id = $1
        ORDER BY timestamp DESC
      `,
      [sessionId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      actorUserId: row.actor_user_id,
      timestamp: row.timestamp,
      metadataJson: row.metadata_json,
    }));
  }
}
