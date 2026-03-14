BEGIN;

CREATE TABLE IF NOT EXISTS family_referrals (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('completed', 'safety_escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_referral_intakes (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL UNIQUE REFERENCES family_referrals(id) ON DELETE CASCADE,
  intake_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_referral_decisions (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL UNIQUE REFERENCES family_referrals(id) ON DELETE CASCADE,
  safety_gate TEXT NOT NULL CHECK (safety_gate IN ('clear', 'urgent', 'immediate')),
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('routine', 'priority', 'urgent', 'immediate')),
  pathway_key TEXT,
  specialty_track TEXT,
  specialist_type TEXT NOT NULL,
  specialist_description TEXT NOT NULL,
  rationale_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  engine_version TEXT NOT NULL,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_referral_reports (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES family_referrals(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('pdf')),
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_referrals_created_at
  ON family_referrals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_referral_decisions_urgency
  ON family_referral_decisions(urgency_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_referral_reports_referral_created
  ON family_referral_reports(referral_id, created_at DESC);

COMMIT;
