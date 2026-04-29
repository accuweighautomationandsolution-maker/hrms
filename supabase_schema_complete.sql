-- ============================================================
-- HRMS Supabase Complete Schema (v1 + v2 combined)
-- Run this in Supabase SQL Editor → it is fully idempotent
-- (safe to run multiple times — uses IF NOT EXISTS everywhere)
-- ============================================================

-- ── 1. Employees ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              BIGSERIAL    PRIMARY KEY,
  name            TEXT         NOT NULL,
  email           TEXT,
  emp_code        TEXT,
  biometric_code  TEXT,
  designation     TEXT,
  department      TEXT,
  joining_date    DATE,
  status          TEXT         DEFAULT 'Active',
  role            TEXT         DEFAULT 'employee',
  data            JSONB,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_employees" ON employees USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Attendance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          BIGSERIAL    PRIMARY KEY,
  emp_id      BIGINT,
  date        DATE         NOT NULL,
  punch_in    TIMESTAMPTZ,
  punch_out   TIMESTAMPTZ,
  status      TEXT,
  location    TEXT,
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_attendance" ON attendance USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Leave Requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id          BIGSERIAL    PRIMARY KEY,
  emp_id      BIGINT,
  type        TEXT,
  start_date  DATE,
  end_date    DATE,
  reason      TEXT,
  status      TEXT         DEFAULT 'Pending',
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_leave_requests" ON leave_requests USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Notices & Memos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          BIGSERIAL    PRIMARY KEY,
  title       TEXT         NOT NULL,
  content     TEXT,
  type        TEXT         DEFAULT 'General',
  priority    TEXT         DEFAULT 'Normal',
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_notices" ON notices USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Policies ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id          TEXT         PRIMARY KEY,
  title       TEXT         NOT NULL,
  category    TEXT,
  status      TEXT         DEFAULT 'Active',
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_policies" ON policies USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. Expenses Ledger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id            BIGINT       PRIMARY KEY,
  emp_id        BIGINT,
  name          TEXT,
  department    TEXT,
  site          TEXT,
  category      TEXT,
  amount        NUMERIC      DEFAULT 0,
  date          DATE,
  status        TEXT         DEFAULT 'Pending',
  payment_mode  TEXT,
  description   TEXT,
  linked_advance TEXT,
  attachments   INT          DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_expenses" ON expenses USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. Salary Advance History ────────────────────────────────
CREATE TABLE IF NOT EXISTS advances (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_advances" ON advances USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. Payroll History ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_history (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_payroll" ON payroll_history USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 9. Projects / Site Master ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL,
  status      TEXT         DEFAULT 'Active',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_projects" ON projects USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 10. Exit & Off-boarding Records ─────────────────────────
CREATE TABLE IF NOT EXISTS exit_records (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE exit_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_exits" ON exit_records USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 11. Training Records ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_records (
  id          BIGINT       PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_training" ON training_records USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 12. Performance / Feedback Records ──────────────────────
CREATE TABLE IF NOT EXISTS feedback_records (
  id          TEXT         PRIMARY KEY,
  emp_id      BIGINT,
  review_type TEXT,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_feedback" ON feedback_records USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 13. Bonus Payments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_payments (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_bonus" ON bonus_payments USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 14. Salary Structures (full JSONB snapshot) ──────────────
CREATE TABLE IF NOT EXISTS salary_structures_ext (
  emp_id       BIGINT      PRIMARY KEY,
  data         JSONB       NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_structures_ext ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_salary_ext" ON salary_structures_ext USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 15. Recruitment Candidates ───────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_candidates" ON candidates USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 16. Compliance Manuals ───────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_manuals (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE compliance_manuals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_manuals" ON compliance_manuals USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Done ──────────────────────────────────────────────────────
-- All 16 tables created. Data will now sync across all devices.
