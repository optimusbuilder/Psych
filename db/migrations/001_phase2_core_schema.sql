BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'school-partner', 'community-partner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'intake_coordinator', 'clinician', 'admin')),
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  sex_at_birth TEXT CHECK (sex_at_birth IN ('female', 'male', 'intersex', 'unknown')),
  guardian_contact TEXT,
  hospital_mrn TEXT,
  linked_org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  route_type TEXT NOT NULL CHECK (route_type IN ('patient_portal', 'provider_portal')),
  started_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'awaiting_instruments', 'flagged_urgent', 'awaiting_review', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referring_providers (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  provider_name TEXT,
  clinical_note TEXT NOT NULL,
  communication_profile TEXT CHECK (
    communication_profile IS NULL
    OR communication_profile IN ('verbal_typical', 'limited_verbal', 'nonverbal', 'unknown')
  ),
  developmental_delay_concern BOOLEAN,
  autism_concern BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_assessments (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL UNIQUE REFERENCES intake_sessions(id) ON DELETE CASCADE,
  suicidal_risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
  violence_risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
  psychosis_mania_flag BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('none', 'urgent', 'immediate')),
  requires_immediate_review BOOLEAN NOT NULL DEFAULT FALSE,
  detail_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symptom_family_assessments (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL UNIQUE REFERENCES intake_sessions(id) ON DELETE CASCADE,
  primary_family TEXT NOT NULL,
  secondary_families_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_mixed_unclear BOOLEAN NOT NULL DEFAULT FALSE,
  family_scores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  most_impairing_concern TEXT,
  insufficient_data BOOLEAN NOT NULL DEFAULT FALSE,
  mixed_signals BOOLEAN NOT NULL DEFAULT FALSE,
  conduct_red_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS functional_impairment_scores (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL UNIQUE REFERENCES intake_sessions(id) ON DELETE CASCADE,
  home_score SMALLINT NOT NULL CHECK (home_score BETWEEN 0 AND 10),
  school_score SMALLINT NOT NULL CHECK (school_score BETWEEN 0 AND 10),
  peer_score SMALLINT NOT NULL CHECK (peer_score BETWEEN 0 AND 10),
  safety_legal_score SMALLINT NOT NULL CHECK (safety_legal_score BETWEEN 0 AND 10),
  overall_severity TEXT NOT NULL CHECK (overall_severity IN ('mild', 'moderate', 'severe', 'unclear')),
  rapid_worsening BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrument_assignments (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  instrument_name TEXT NOT NULL,
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('patient', 'caregiver', 'teacher', 'clinician')),
  status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed', 'scored', 'cancelled')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrument_results (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES instrument_assignments(id) ON DELETE CASCADE,
  raw_score NUMERIC,
  interpretation TEXT,
  cutoff_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  structured_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triage_decisions (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL,
  pathway_key TEXT,
  specialty_track TEXT,
  reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_clinician_review BOOLEAN NOT NULL DEFAULT FALSE,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('routine', 'priority', 'urgent', 'immediate')),
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinician_reviews (
  id TEXT PRIMARY KEY,
  intake_session_id TEXT NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  override_applied BOOLEAN NOT NULL DEFAULT FALSE,
  final_disposition TEXT NOT NULL,
  rationale TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_status_created_at
  ON intake_sessions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_triage_decisions_urgency_level_created_at
  ON triage_decisions(urgency_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinician_reviews_reviewed_at
  ON clinician_reviews(reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, "timestamp" DESC);

COMMIT;
