import type {
  ClinicianOverrideInput,
  CreateSessionInput,
  FunctionalImpactInput,
  RespondentInput,
  SafetyInput,
  ScoreInstrumentInput,
  SymptomInput,
} from "./contracts";
import { buildId, computeOverallSeverity } from "./utils";
import { evaluateSafety } from "../safety/service";
import {
  evaluateTriageRules,
  rulesInputFromAggregate,
  type CommunicationProfile,
  type PathwayKey,
  type SpecialtyTrack,
} from "../rules/engine";
import {
  buildDecisionUpdateFromInstrument,
  INSTRUMENT_ENGINE_VERSION,
  interpretInstrumentScore,
  recommendInstruments,
  type InstrumentAssignedTo,
  type InstrumentName,
} from "../instruments/service";

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
    communicationProfile: CommunicationProfile;
    developmentalDelayConcern: boolean;
    autismConcern: boolean;
  } | null;
  safetyAssessment: {
    id: string;
    suicidalRiskFlag: boolean;
    violenceRiskFlag: boolean;
    psychosisManiaFlag: boolean;
    escalationLevel: string;
    requiresImmediateReview: boolean;
    detailFlags: Record<string, unknown>;
    notes: string | null;
  } | null;
  symptomAssessment: {
    id: string;
    primaryFamily: string;
    secondaryFamilies: string[];
    isMixedUnclear: boolean;
    familyScores: Record<string, number>;
    mostImpairingConcern: string | null;
    insufficientData: boolean;
    mixedSignals: boolean;
    conductRedFlags: Record<string, boolean>;
  } | null;
  functionalImpact: {
    id: string;
    homeScore: number;
    schoolScore: number;
    peerScore: number;
    safetyLegalScore: number;
    overallSeverity: string;
    rapidWorsening: boolean;
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

export interface InstrumentAssignmentRow {
  id: string;
  intakeSessionId: string;
  instrumentName: string;
  assignedTo: InstrumentAssignedTo;
  status: string;
  dueAt: string | null;
  createdAt: string;
}

export interface InstrumentScoreResultRow {
  assignmentId: string;
  intakeSessionId: string;
  instrumentName: string;
  assignedTo: InstrumentAssignedTo;
  status: string;
  rawScore: number;
  interpretation: string;
  cutoffTriggered: boolean;
  structuredJson: unknown;
  decisionUpdated: boolean;
  decisionUpdate: {
    recommendation: string;
    requiresClinicianReview: boolean;
    urgencyLevel: string;
    engineVersion: string;
  } | null;
}

export type ReviewQueueStatus = "all" | "awaiting_review" | "flagged_urgent";

export interface ReviewQueueCaseRow {
  sessionId: string;
  patientId: string;
  patientName: string;
  routeType: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  latestDecision: {
    recommendation: string;
    pathwayKey: PathwayKey | null;
    specialtyTrack: SpecialtyTrack | null;
    reasonCodes: string[];
    requiresClinicianReview: boolean;
    urgencyLevel: string;
    engineVersion: string;
    createdAt: string;
  } | null;
}

export interface ClinicianReviewHistoryRow {
  id: string;
  intakeSessionId: string;
  reviewerUserId: string | null;
  overrideApplied: boolean;
  finalDisposition: string;
  rationale: string;
  reviewedAt: string;
  createdAt: string;
}

export interface ProviderCaseDetail {
  session: IntakeSessionAggregate["session"];
  patient: IntakeSessionAggregate["patient"];
  respondent: IntakeSessionAggregate["respondent"];
  safetyAssessment: IntakeSessionAggregate["safetyAssessment"];
  symptomAssessment: IntakeSessionAggregate["symptomAssessment"];
  functionalImpact: IntakeSessionAggregate["functionalImpact"];
  latestDecision: ReviewQueueCaseRow["latestDecision"];
  instrumentAssignments: Array<
    InstrumentAssignmentRow & {
      result: {
        rawScore: number | null;
        interpretation: string | null;
        cutoffTriggered: boolean | null;
        structuredJson: unknown;
      } | null;
    }
  >;
  clinicianReviews: ClinicianReviewHistoryRow[];
  auditTrail: AuditLogRow[];
}

export interface UserAccessProfile {
  id: string;
  role: string;
  organizationId: string | null;
}

export class IntakeRepository {
  constructor(private readonly db: SqlClient) {}

  async getUserAccessProfile(userId: string): Promise<UserAccessProfile | null> {
    const result = await this.db.query<{
      id: string;
      role: string;
      organization_id: string | null;
    }>(
      `
        SELECT id, role, organization_id
        FROM users
        WHERE id = $1
      `,
      [userId],
    );
    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      role: result.rows[0].role,
      organizationId: result.rows[0].organization_id,
    };
  }

  async getSessionLinkedOrganizationId(sessionId: string): Promise<string | null | undefined> {
    const result = await this.db.query<{ linked_org_id: string | null }>(
      `
        SELECT p.linked_org_id
        FROM intake_sessions s
        JOIN patients p
          ON p.id = s.patient_id
        WHERE s.id = $1
      `,
      [sessionId],
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return result.rows[0].linked_org_id;
  }

  async canOrganizationAccessSession(sessionId: string, organizationId: string): Promise<boolean | null> {
    const linkedOrgId = await this.getSessionLinkedOrganizationId(sessionId);
    if (typeof linkedOrgId === "undefined") {
      return null;
    }
    return linkedOrgId === null || linkedOrgId === organizationId;
  }

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

  private async getLatestDecisionForSession(sessionId: string) {
    const result = await this.db.query<{
      recommendation: string;
      pathway_key: PathwayKey | null;
      specialty_track: SpecialtyTrack | null;
      reason_codes_json: string[] | null;
      requires_clinician_review: boolean;
      urgency_level: string;
      engine_version: string;
      created_at: string;
    }>(
      `
        SELECT
          recommendation,
          pathway_key,
          specialty_track,
          reason_codes_json,
          requires_clinician_review,
          urgency_level,
          engine_version,
          created_at
        FROM triage_decisions
        WHERE intake_session_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [sessionId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      recommendation: result.rows[0].recommendation,
      pathwayKey: result.rows[0].pathway_key,
      specialtyTrack: result.rows[0].specialty_track,
      reasonCodes: result.rows[0].reason_codes_json ?? [],
      requiresClinicianReview: result.rows[0].requires_clinician_review,
      urgencyLevel: result.rows[0].urgency_level,
      engineVersion: result.rows[0].engine_version,
      createdAt: result.rows[0].created_at,
    };
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
            age_if_patient,
            communication_profile,
            developmental_delay_concern,
            autism_concern
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          respondentId,
          sessionId,
          input.type,
          input.relationshipToPatient ?? null,
          input.ageIfPatient ?? null,
          input.communicationProfile ?? "unknown",
          input.developmentalDelayConcern ?? false,
          input.autismConcern ?? false,
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
            detail_flags_json,
            notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
          ON CONFLICT (intake_session_id)
          DO UPDATE SET
            suicidal_risk_flag = EXCLUDED.suicidal_risk_flag,
            violence_risk_flag = EXCLUDED.violence_risk_flag,
            psychosis_mania_flag = EXCLUDED.psychosis_mania_flag,
            escalation_level = EXCLUDED.escalation_level,
            requires_immediate_review = EXCLUDED.requires_immediate_review,
            detail_flags_json = EXCLUDED.detail_flags_json,
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
          JSON.stringify(input.detailFlags ?? {}),
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
          "safety_screen_completed",
          actorIdForAudit,
          JSON.stringify({
            escalationLevel: evaluation.escalationLevel,
            reasonCodes: evaluation.reasonCodes,
          }),
        ],
      );

      if (evaluation.autoRoutingSuspended) {
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
            "auto_routing_suspended",
            actorIdForAudit,
            JSON.stringify({
              escalationLevel: evaluation.escalationLevel,
              reasonCodes: evaluation.reasonCodes,
            }),
          ],
        );
      }

      if (evaluation.requiresImmediateReview) {
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
          is_mixed_unclear,
          family_scores_json,
          most_impairing_concern,
          insufficient_data,
          mixed_signals,
          conduct_red_flags_json
        ) VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10::jsonb)
        ON CONFLICT (intake_session_id)
        DO UPDATE SET
          primary_family = EXCLUDED.primary_family,
          secondary_families_json = EXCLUDED.secondary_families_json,
          is_mixed_unclear = EXCLUDED.is_mixed_unclear,
          family_scores_json = EXCLUDED.family_scores_json,
          most_impairing_concern = EXCLUDED.most_impairing_concern,
          insufficient_data = EXCLUDED.insufficient_data,
          mixed_signals = EXCLUDED.mixed_signals,
          conduct_red_flags_json = EXCLUDED.conduct_red_flags_json
        RETURNING id
      `,
      [
        symptomId,
        sessionId,
        input.primaryFamily,
        JSON.stringify(input.secondaryFamilies ?? []),
        input.isMixedUnclear ?? false,
        JSON.stringify(input.familyScores ?? {}),
        input.mostImpairingConcern ?? null,
        input.insufficientData ?? false,
        input.mixedSignals ?? false,
        JSON.stringify(input.conductRedFlags ?? {}),
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
          overall_severity,
          rapid_worsening
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (intake_session_id)
        DO UPDATE SET
          home_score = EXCLUDED.home_score,
          school_score = EXCLUDED.school_score,
          peer_score = EXCLUDED.peer_score,
          safety_legal_score = EXCLUDED.safety_legal_score,
          overall_severity = EXCLUDED.overall_severity,
          rapid_worsening = EXCLUDED.rapid_worsening
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
        input.rapidWorsening ?? false,
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
      communication_profile: CommunicationProfile | null;
      developmental_delay_concern: boolean | null;
      autism_concern: boolean | null;
    }>(
      `
        SELECT
          id,
          type,
          relationship_to_patient,
          age_if_patient,
          communication_profile,
          developmental_delay_concern,
          autism_concern
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
      detail_flags_json: Record<string, unknown> | null;
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
          detail_flags_json,
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
      family_scores_json: Record<string, number> | null;
      most_impairing_concern: string | null;
      insufficient_data: boolean;
      mixed_signals: boolean;
      conduct_red_flags_json: Record<string, boolean> | null;
    }>(
      `
        SELECT
          id,
          primary_family,
          secondary_families_json,
          is_mixed_unclear,
          family_scores_json,
          most_impairing_concern,
          insufficient_data,
          mixed_signals,
          conduct_red_flags_json
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
      rapid_worsening: boolean;
    }>(
      `
        SELECT
          id,
          home_score,
          school_score,
          peer_score,
          safety_legal_score,
          overall_severity,
          rapid_worsening
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
              communicationProfile: respondentResult.rows[0].communication_profile ?? "unknown",
              developmentalDelayConcern:
                respondentResult.rows[0].developmental_delay_concern ?? false,
              autismConcern: respondentResult.rows[0].autism_concern ?? false,
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
              detailFlags: safetyResult.rows[0].detail_flags_json ?? {},
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
              familyScores: symptomResult.rows[0].family_scores_json ?? {},
              mostImpairingConcern: symptomResult.rows[0].most_impairing_concern,
              insufficientData: symptomResult.rows[0].insufficient_data,
              mixedSignals: symptomResult.rows[0].mixed_signals,
              conductRedFlags: symptomResult.rows[0].conduct_red_flags_json ?? {},
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
              rapidWorsening: functionalResult.rows[0].rapid_worsening,
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
            pathway_key,
            specialty_track,
            reason_codes_json,
            requires_clinician_review,
            urgency_level,
            engine_version
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
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
          decision.pathwayKey,
          decision.specialtyTrack,
          JSON.stringify(decision.reasonCodes),
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

  async routeInstruments(sessionId: string) {
    const aggregate = await this.getSessionAggregate(sessionId);
    if (!aggregate) {
      return null;
    }

    const missing: string[] = [];
    if (!aggregate.safetyAssessment) {
      missing.push("safetyAssessment");
    }

    const safetyPositive = aggregate.safetyAssessment?.requiresImmediateReview === true;
    if (!aggregate.respondent) {
      missing.push("respondent");
    }
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
        routed: false as const,
        missing,
      };
    }

    const decision = evaluateTriageRules(rulesInputFromAggregate(aggregate));
    const recommendations = recommendInstruments({
      ageBand: decision.ageBand,
      symptomFamily: decision.normalizedSymptomFamily,
      severityTier: decision.severityTier,
    });

    await this.db.query("BEGIN");
    try {
      const existing = await this.db.query<{
        instrument_name: string;
        assigned_to: InstrumentAssignedTo;
      }>(
        `
          SELECT instrument_name, assigned_to
          FROM instrument_assignments
          WHERE intake_session_id = $1
        `,
        [sessionId],
      );
      const existingSet = new Set(
        existing.rows.map((row) => `${row.instrument_name}::${row.assigned_to}`),
      );

      let insertedCount = 0;
      for (const recommendation of recommendations) {
        const key = `${recommendation.instrumentName}::${recommendation.assignedTo}`;
        if (existingSet.has(key)) {
          continue;
        }
        await this.db.query(
          `
            INSERT INTO instrument_assignments (
              id,
              intake_session_id,
              instrument_name,
              assigned_to,
              status,
              due_at
            ) VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '72 hours')
          `,
          [
            buildId("assign"),
            sessionId,
            recommendation.instrumentName,
            recommendation.assignedTo,
            "assigned",
          ],
        );
        existingSet.add(key);
        insertedCount += 1;
      }

      await this.db.query("COMMIT");

      const assignments = await this.listInstrumentAssignments(sessionId);
      return {
        routed: true as const,
        recommendedCount: recommendations.length,
        insertedCount,
        assignments,
        engineVersion: decision.engineVersion,
        instrumentEngineVersion: INSTRUMENT_ENGINE_VERSION,
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async listInstrumentAssignments(sessionId: string): Promise<InstrumentAssignmentRow[]> {
    const result = await this.db.query<{
      id: string;
      intake_session_id: string;
      instrument_name: string;
      assigned_to: InstrumentAssignedTo;
      status: string;
      due_at: string | null;
      created_at: string;
    }>(
      `
        SELECT
          id,
          intake_session_id,
          instrument_name,
          assigned_to,
          status,
          due_at,
          created_at
        FROM instrument_assignments
        WHERE intake_session_id = $1
        ORDER BY created_at ASC
      `,
      [sessionId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      intakeSessionId: row.intake_session_id,
      instrumentName: row.instrument_name,
      assignedTo: row.assigned_to,
      status: row.status,
      dueAt: row.due_at,
      createdAt: row.created_at,
    }));
  }

  async completeInstrumentAssignment(assignmentId: string) {
    const current = await this.db.query<{
      id: string;
      intake_session_id: string;
      instrument_name: string;
      assigned_to: InstrumentAssignedTo;
      status: string;
      due_at: string | null;
      created_at: string;
    }>(
      `
        SELECT
          id,
          intake_session_id,
          instrument_name,
          assigned_to,
          status,
          due_at,
          created_at
        FROM instrument_assignments
        WHERE id = $1
      `,
      [assignmentId],
    );
    if (current.rows.length === 0) {
      return null;
    }

    const assignment = current.rows[0];
    if (assignment.status === "scored" || assignment.status === "cancelled") {
      return {
        completed: false as const,
        reason: "InvalidTransition",
        currentStatus: assignment.status,
      };
    }

    if (assignment.status === "completed") {
      return {
        completed: true as const,
        assignment: {
          id: assignment.id,
          intakeSessionId: assignment.intake_session_id,
          instrumentName: assignment.instrument_name,
          assignedTo: assignment.assigned_to,
          status: assignment.status,
          dueAt: assignment.due_at,
          createdAt: assignment.created_at,
        },
      };
    }

    const updated = await this.db.query<{
      id: string;
      intake_session_id: string;
      instrument_name: string;
      assigned_to: InstrumentAssignedTo;
      status: string;
      due_at: string | null;
      created_at: string;
    }>(
      `
        UPDATE instrument_assignments
        SET status = 'completed'
        WHERE id = $1
        RETURNING
          id,
          intake_session_id,
          instrument_name,
          assigned_to,
          status,
          due_at,
          created_at
      `,
      [assignmentId],
    );

    return {
      completed: true as const,
      assignment: {
        id: updated.rows[0].id,
        intakeSessionId: updated.rows[0].intake_session_id,
        instrumentName: updated.rows[0].instrument_name,
        assignedTo: updated.rows[0].assigned_to,
        status: updated.rows[0].status,
        dueAt: updated.rows[0].due_at,
        createdAt: updated.rows[0].created_at,
      },
    };
  }

  async scoreInstrumentAssignment(assignmentId: string, input: ScoreInstrumentInput) {
    const assignmentResult = await this.db.query<{
      id: string;
      intake_session_id: string;
      instrument_name: string;
      assigned_to: InstrumentAssignedTo;
      status: string;
    }>(
      `
        SELECT
          id,
          intake_session_id,
          instrument_name,
          assigned_to,
          status
        FROM instrument_assignments
        WHERE id = $1
      `,
      [assignmentId],
    );
    if (assignmentResult.rows.length === 0) {
      return null;
    }
    const assignment = assignmentResult.rows[0];

    if (assignment.status !== "completed") {
      return {
        scored: false as const,
        reason: "AssignmentMustBeCompleted",
        currentStatus: assignment.status,
      };
    }

    const interpretation = interpretInstrumentScore(
      assignment.instrument_name as InstrumentName,
      input.rawScore,
    );

    await this.db.query("BEGIN");
    try {
      const resultId = buildId("result");
      const result = await this.db.query<{
        raw_score: number;
        interpretation: string;
        cutoff_triggered: boolean;
        structured_json: unknown;
      }>(
        `
          INSERT INTO instrument_results (
            id,
            assignment_id,
            raw_score,
            interpretation,
            cutoff_triggered,
            structured_json
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
          ON CONFLICT (assignment_id)
          DO UPDATE SET
            raw_score = EXCLUDED.raw_score,
            interpretation = EXCLUDED.interpretation,
            cutoff_triggered = EXCLUDED.cutoff_triggered,
            structured_json = EXCLUDED.structured_json
          RETURNING
            raw_score,
            interpretation,
            cutoff_triggered,
            structured_json
        `,
        [
          resultId,
          assignmentId,
          input.rawScore,
          interpretation.interpretation,
          interpretation.cutoffTriggered,
          JSON.stringify({
            ...(input.structuredJson ?? {}),
            severityBand: interpretation.severityBand,
          }),
        ],
      );

      await this.db.query(
        `
          UPDATE instrument_assignments
          SET status = 'scored'
          WHERE id = $1
        `,
        [assignmentId],
      );

      let decisionUpdated = false;
      let decisionUpdate: InstrumentScoreResultRow["decisionUpdate"] = null;
      if (interpretation.cutoffTriggered) {
        const latestDecision = await this.db.query<{
          urgency_level: string;
        }>(
          `
            SELECT urgency_level
            FROM triage_decisions
            WHERE intake_session_id = $1
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [assignment.intake_session_id],
        );
        const currentUrgency =
          (latestDecision.rows[0]?.urgency_level as "routine" | "priority" | "urgent" | "immediate") ??
          "routine";

        const update = buildDecisionUpdateFromInstrument(interpretation, currentUrgency);
        if (update) {
          decisionUpdated = true;
          decisionUpdate = {
            recommendation: update.recommendation,
            requiresClinicianReview: update.requiresClinicianReview,
            urgencyLevel: update.urgencyLevel,
            engineVersion: update.engineVersion,
          };

          await this.db.query(
            `
              INSERT INTO triage_decisions (
                id,
                intake_session_id,
                recommendation,
                requires_clinician_review,
                urgency_level,
                engine_version
              ) VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [
              buildId("decision"),
              assignment.intake_session_id,
              update.recommendation,
              update.requiresClinicianReview,
              update.urgencyLevel,
              update.engineVersion,
            ],
          );

          await this.db.query(
            `
              UPDATE intake_sessions
              SET status = CASE
                WHEN status = 'flagged_urgent' THEN status
                WHEN $2::boolean = TRUE THEN 'awaiting_review'
                ELSE status
              END
              WHERE id = $1
            `,
            [assignment.intake_session_id, update.requiresClinicianReview],
          );
        }
      }

      await this.db.query("COMMIT");

      return {
        scored: true as const,
        result: {
          assignmentId,
          intakeSessionId: assignment.intake_session_id,
          instrumentName: assignment.instrument_name,
          assignedTo: assignment.assigned_to,
          status: "scored",
          rawScore: Number(result.rows[0].raw_score),
          interpretation: result.rows[0].interpretation,
          cutoffTriggered: result.rows[0].cutoff_triggered,
          structuredJson: result.rows[0].structured_json,
          decisionUpdated,
          decisionUpdate,
        } satisfies InstrumentScoreResultRow,
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async listReviewQueue(
    status: ReviewQueueStatus = "all",
    limit = 25,
    organizationId?: string | null,
  ): Promise<ReviewQueueCaseRow[]> {
    const params: unknown[] = [];
    const whereParts: string[] = [];

    if (status === "all") {
      whereParts.push(
        "s.status IN ('awaiting_review', 'flagged_urgent', 'awaiting_instruments', 'completed')",
      );
    } else {
      params.push(status);
      whereParts.push(`s.status = $${params.length}`);
    }

    if (organizationId) {
      params.push(organizationId);
      whereParts.push(`(p.linked_org_id IS NULL OR p.linked_org_id = $${params.length})`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    const result = await this.db.query<{
      session_id: string;
      patient_id: string;
      first_name: string;
      last_name: string;
      route_type: string;
      status: string;
      submitted_at: string | null;
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
          s.submitted_at,
          s.created_at
        FROM intake_sessions s
        JOIN patients p
          ON p.id = s.patient_id
        WHERE ${whereParts.join(" AND ")}
        ORDER BY COALESCE(s.submitted_at, s.created_at) DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
    );

    const queueItems = await Promise.all(
      result.rows.map(async (row) => ({
        sessionId: row.session_id,
        patientId: row.patient_id,
        patientName: `${row.first_name} ${row.last_name}`,
        routeType: row.route_type,
        status: row.status,
        submittedAt: row.submitted_at,
        createdAt: row.created_at,
        latestDecision: await this.getLatestDecisionForSession(row.session_id),
      })),
    );

    return queueItems;
  }

  async listClinicianReviewsForSession(sessionId: string): Promise<ClinicianReviewHistoryRow[]> {
    const result = await this.db.query<{
      id: string;
      intake_session_id: string;
      reviewer_user_id: string | null;
      override_applied: boolean;
      final_disposition: string;
      rationale: string;
      reviewed_at: string;
      created_at: string;
    }>(
      `
        SELECT
          id,
          intake_session_id,
          reviewer_user_id,
          override_applied,
          final_disposition,
          rationale,
          reviewed_at,
          created_at
        FROM clinician_reviews
        WHERE intake_session_id = $1
        ORDER BY reviewed_at DESC
      `,
      [sessionId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      intakeSessionId: row.intake_session_id,
      reviewerUserId: row.reviewer_user_id,
      overrideApplied: row.override_applied,
      finalDisposition: row.final_disposition,
      rationale: row.rationale,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
    }));
  }

  async getProviderCaseDetail(sessionId: string): Promise<ProviderCaseDetail | null> {
    const aggregate = await this.getSessionAggregate(sessionId);
    if (!aggregate) {
      return null;
    }

    const latestDecision = await this.getLatestDecisionForSession(sessionId);
    const assignmentRows = await this.db.query<{
      id: string;
      intake_session_id: string;
      instrument_name: string;
      assigned_to: InstrumentAssignedTo;
      status: string;
      due_at: string | null;
      created_at: string;
      raw_score: number | null;
      interpretation: string | null;
      cutoff_triggered: boolean | null;
      structured_json: unknown;
    }>(
      `
        SELECT
          ia.id,
          ia.intake_session_id,
          ia.instrument_name,
          ia.assigned_to,
          ia.status,
          ia.due_at,
          ia.created_at,
          ir.raw_score,
          ir.interpretation,
          ir.cutoff_triggered,
          ir.structured_json
        FROM instrument_assignments ia
        LEFT JOIN instrument_results ir
          ON ir.assignment_id = ia.id
        WHERE ia.intake_session_id = $1
        ORDER BY ia.created_at ASC
      `,
      [sessionId],
    );

    const clinicianReviews = await this.listClinicianReviewsForSession(sessionId);
    const auditTrail = await this.listAuditLogsForSession(sessionId);

    return {
      session: aggregate.session,
      patient: aggregate.patient,
      respondent: aggregate.respondent,
      safetyAssessment: aggregate.safetyAssessment,
      symptomAssessment: aggregate.symptomAssessment,
      functionalImpact: aggregate.functionalImpact,
      latestDecision,
      instrumentAssignments: assignmentRows.rows.map((row) => ({
        id: row.id,
        intakeSessionId: row.intake_session_id,
        instrumentName: row.instrument_name,
        assignedTo: row.assigned_to,
        status: row.status,
        dueAt: row.due_at,
        createdAt: row.created_at,
        result:
          row.raw_score === null && row.interpretation === null
            ? null
            : {
                rawScore: row.raw_score,
                interpretation: row.interpretation,
                cutoffTriggered: row.cutoff_triggered,
                structuredJson: row.structured_json,
              },
      })),
      clinicianReviews,
      auditTrail,
    };
  }

  async applyClinicianReview(
    sessionId: string,
    input: ClinicianOverrideInput,
    actorUserId: string | null = null,
  ) {
    const sessionExists = await this.ensureSessionExists(sessionId);
    if (!sessionExists) {
      return null;
    }

    const latestDecision = await this.getLatestDecisionForSession(sessionId);
    const currentUrgency = latestDecision?.urgencyLevel ?? "priority";

    let actorIdForReview: string | null = actorUserId;
    if (actorUserId) {
      const actorLookup = await this.db.query<{ id: string }>(
        "SELECT id FROM users WHERE id = $1",
        [actorUserId],
      );
      actorIdForReview = actorLookup.rows.length > 0 ? actorUserId : null;
    }

    await this.db.query("BEGIN");
    try {
      const reviewId = buildId("review");
      const review = await this.db.query<{
        id: string;
        intake_session_id: string;
        reviewer_user_id: string | null;
        override_applied: boolean;
        final_disposition: string;
        rationale: string;
        reviewed_at: string;
        created_at: string;
      }>(
        `
          INSERT INTO clinician_reviews (
            id,
            intake_session_id,
            reviewer_user_id,
            override_applied,
            final_disposition,
            rationale,
            reviewed_at
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
          RETURNING
            id,
            intake_session_id,
            reviewer_user_id,
            override_applied,
            final_disposition,
            rationale,
            reviewed_at,
            created_at
        `,
        [
          reviewId,
          sessionId,
          actorIdForReview,
          input.overrideApplied,
          input.finalDisposition,
          input.rationale,
        ],
      );

      await this.db.query(
        `
          INSERT INTO triage_decisions (
            id,
            intake_session_id,
            recommendation,
            requires_clinician_review,
            urgency_level,
            engine_version
          ) VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          buildId("decision"),
          sessionId,
          input.finalDisposition,
          false,
          currentUrgency,
          "clinician-review-v1.0.0",
        ],
      );

      let sessionStatus = (await this.db.query<{ status: string }>(
        "SELECT status FROM intake_sessions WHERE id = $1",
        [sessionId],
      )).rows[0]?.status ?? "awaiting_review";

      if (input.finalizeSession) {
        const sessionUpdate = await this.db.query<{ status: string }>(
          `
            UPDATE intake_sessions
            SET status = 'completed'
            WHERE id = $1
            RETURNING status
          `,
          [sessionId],
        );
        sessionStatus = sessionUpdate.rows[0].status;
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
          "clinician_review_recorded",
          actorIdForReview,
          JSON.stringify({
            reviewId,
            overrideApplied: input.overrideApplied,
            finalDisposition: input.finalDisposition,
          }),
        ],
      );

      if (input.overrideApplied) {
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
            "override_applied",
            actorIdForReview,
            JSON.stringify({
              reviewId,
              rationale: input.rationale,
            }),
          ],
        );
      }

      if (input.finalizeSession) {
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
            "disposition_finalized",
            actorIdForReview,
            JSON.stringify({
              reviewId,
              finalDisposition: input.finalDisposition,
            }),
          ],
        );
      }

      await this.db.query("COMMIT");

      return {
        review: {
          id: review.rows[0].id,
          intakeSessionId: review.rows[0].intake_session_id,
          reviewerUserId: review.rows[0].reviewer_user_id,
          overrideApplied: review.rows[0].override_applied,
          finalDisposition: review.rows[0].final_disposition,
          rationale: review.rows[0].rationale,
          reviewedAt: review.rows[0].reviewed_at,
          createdAt: review.rows[0].created_at,
        },
        sessionStatus,
      };
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async listUrgentCases(limit = 25, organizationId?: string | null): Promise<UrgentCaseRow[]> {
    const params: unknown[] = [];
    const whereParts = ["s.status = 'flagged_urgent'"];
    if (organizationId) {
      params.push(organizationId);
      whereParts.push(`(p.linked_org_id IS NULL OR p.linked_org_id = $${params.length})`);
    }
    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

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
        WHERE ${whereParts.join(" AND ")}
        ORDER BY s.created_at DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
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
