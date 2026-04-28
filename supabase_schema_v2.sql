-- ============================================================
-- HRMS Supabase Schema v2 — Run in Supabase SQL Editor
-- Adds all tables missing from v1 so data syncs across devices
-- ============================================================

-- ── 1. Expenses Ledger ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          BIGINT       PRIMARY KEY,
  emp_id      BIGINT,
  name        TEXT,
  department  TEXT,
  site        TEXT,
  category    TEXT,
  amount      NUMERIC      DEFAULT 0,
  date        DATE,
  status      TEXT         DEFAULT 'Pending',
  payment_mode TEXT,
  description TEXT,
  linked_advance TEXT,
  attachments INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_expenses"  ON expenses  USING (true) WITH CHECK (true);

-- ── 2. Salary Advance History ───────────────────────────────
CREATE TABLE IF NOT EXISTS advances (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_advances"  ON advances  USING (true) WITH CHECK (true);

-- ── 3. Payroll History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_history (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_payroll"   ON payroll_history USING (true) WITH CHECK (true);

-- ── 4. Projects / Site Master ───────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL,
  status      TEXT         DEFAULT 'Active',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_projects"  ON projects  USING (true) WITH CHECK (true);

-- ── 5. Exit & Off-boarding Records ─────────────────────────
CREATE TABLE IF NOT EXISTS exit_records (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE exit_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_exits"     ON exit_records USING (true) WITH CHECK (true);

-- ── 6. Training Records ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_records (
  id          BIGINT       PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_training"  ON training_records USING (true) WITH CHECK (true);

-- ── 7. Performance / Feedback Records ──────────────────────
CREATE TABLE IF NOT EXISTS feedback_records (
  id          TEXT         PRIMARY KEY,
  emp_id      BIGINT,
  review_type TEXT,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_feedback"  ON feedback_records USING (true) WITH CHECK (true);

-- ── 8. Bonus Payments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_payments (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_bonus"     ON bonus_payments USING (true) WITH CHECK (true);

-- ── 9. Salary Structures (extended, full JSONB snapshot) ───
CREATE TABLE IF NOT EXISTS salary_structures_ext (
  emp_id       BIGINT      PRIMARY KEY,
  data         JSONB       NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_structures_ext ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_salary_ext" ON salary_structures_ext USING (true) WITH CHECK (true);

-- ── 10. Recruitment Candidates ──────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_candidates" ON candidates USING (true) WITH CHECK (true);

-- ── 11. Compliance Manuals ──────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_manuals (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE compliance_manuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_manuals"   ON compliance_manuals USING (true) WITH CHECK (true);

-- ── RLS policies for tables from v1 (adds write access) ────
-- These were read-only before; now allow writes too
DO $$ BEGIN
  CREATE POLICY "allow_write_employees"
    ON employees FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "allow_write_notices"
    ON notices FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "allow_write_leave_requests"
    ON leave_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "allow_write_attendance"
    ON attendance FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
