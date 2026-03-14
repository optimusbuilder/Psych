BEGIN;

INSERT INTO organizations (id, name, type, created_at)
VALUES
  ('org-001', 'Project Cura Children''s Hospital', 'hospital', '2026-03-14T09:00:00Z');

INSERT INTO users (id, name, email, role, organization_id, created_at)
VALUES
  ('user-intake-001', 'Jamie Intake', 'jamie.intake@cura.org', 'intake_coordinator', 'org-001', '2026-03-14T09:05:00Z'),
  ('user-clin-001', 'Dr. Sarah Chen', 'sarah.chen@cura.org', 'clinician', 'org-001', '2026-03-14T09:06:00Z');

INSERT INTO patients (id, first_name, last_name, dob, sex_at_birth, guardian_contact, hospital_mrn, linked_org_id, created_at)
VALUES
  ('patient-001', 'Ava', 'Chen', '2010-05-14', 'female', 'Parent: +1-555-0110', 'MRN-104422', 'org-001', '2026-03-14T09:10:00Z');

INSERT INTO intake_sessions (id, patient_id, route_type, started_by_user_id, status, created_at, submitted_at)
VALUES
  ('session-001', 'patient-001', 'patient_portal', 'user-intake-001', 'awaiting_review', '2026-03-14T09:15:00Z', '2026-03-14T09:22:00Z');

INSERT INTO respondents (id, intake_session_id, type, relationship_to_patient, age_if_patient, created_at)
VALUES
  ('respondent-001', 'session-001', 'caregiver', 'mother', NULL, '2026-03-14T09:16:00Z');

INSERT INTO safety_assessments (
  id,
  intake_session_id,
  suicidal_risk_flag,
  violence_risk_flag,
  psychosis_mania_flag,
  escalation_level,
  requires_immediate_review,
  notes,
  created_at
)
VALUES
  ('safety-001', 'session-001', TRUE, FALSE, FALSE, 'urgent', TRUE, 'Positive suicidal ideation item; urgent review queued.', '2026-03-14T09:18:00Z');

INSERT INTO symptom_family_assessments (
  id,
  intake_session_id,
  primary_family,
  secondary_families_json,
  is_mixed_unclear,
  created_at
)
VALUES
  ('symptom-001', 'session-001', 'Mood / Depression / Irritability', '["Anxiety / Worry / Panic / School Refusal / OCD-like"]'::jsonb, FALSE, '2026-03-14T09:19:00Z');

INSERT INTO functional_impairment_scores (
  id,
  intake_session_id,
  home_score,
  school_score,
  peer_score,
  safety_legal_score,
  overall_severity,
  created_at
)
VALUES
  ('impact-001', 'session-001', 8, 9, 8, 7, 'severe', '2026-03-14T09:20:00Z');

INSERT INTO instrument_assignments (
  id,
  intake_session_id,
  instrument_name,
  assigned_to,
  status,
  due_at,
  created_at
)
VALUES
  ('assign-001', 'session-001', 'PHQ-A', 'patient', 'scored', '2026-03-15T09:20:00Z', '2026-03-14T09:20:30Z');

INSERT INTO instrument_results (
  id,
  assignment_id,
  raw_score,
  interpretation,
  cutoff_triggered,
  structured_json,
  created_at
)
VALUES
  ('result-001', 'assign-001', 17, 'Moderately severe depressive symptoms', TRUE, '{"cutoff": 10, "scoreBand": "moderately_severe"}'::jsonb, '2026-03-14T09:21:00Z');

INSERT INTO triage_decisions (
  id,
  intake_session_id,
  recommendation,
  requires_clinician_review,
  urgency_level,
  engine_version,
  created_at
)
VALUES
  ('decision-001', 'session-001', 'Urgent psychiatric evaluation recommended within 24 hours.', TRUE, 'urgent', 'v1.0.0', '2026-03-14T09:22:00Z');

INSERT INTO clinician_reviews (
  id,
  intake_session_id,
  reviewer_user_id,
  override_applied,
  final_disposition,
  rationale,
  reviewed_at,
  created_at
)
VALUES
  ('review-001', 'session-001', 'user-clin-001', TRUE, 'Urgent child psychiatry intake scheduled', 'Safety flag and severe school/home impairment require urgent specialist follow-up.', '2026-03-14T09:30:00Z', '2026-03-14T09:30:00Z');

INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_user_id, "timestamp", metadata_json)
VALUES
  ('audit-001', 'intake_session', 'session-001', 'safety_flagged', 'user-intake-001', '2026-03-14T09:18:00Z', '{"escalationLevel":"urgent"}'::jsonb),
  ('audit-002', 'clinician_review', 'review-001', 'override_applied', 'user-clin-001', '2026-03-14T09:30:00Z', '{"reason":"urgent_specialty_followup"}'::jsonb);

COMMIT;
