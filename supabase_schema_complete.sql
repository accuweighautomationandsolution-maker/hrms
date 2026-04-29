-- ============================================================
-- HRMS Supabase Complete Schema — v3 (Full Supabase Migration)
-- Run in Supabase SQL Editor — fully idempotent (safe to re-run)
-- ============================================================

-- ── 1. User Profiles (linked to Supabase Auth) ───────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  name        TEXT         NOT NULL,
  role        TEXT         NOT NULL DEFAULT 'employee',
  emp_id      BIGINT,
  active      BOOLEAN      DEFAULT true,
  force_password_reset BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_user_profiles" ON user_profiles USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Employees ─────────────────────────────────────────────
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

-- ── 3. Attendance ────────────────────────────────────────────
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

-- ── 4. Leave Requests ────────────────────────────────────────
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

-- ── 5. Leave Balances ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  emp_id      BIGINT       PRIMARY KEY,
  data        JSONB        NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_leave_balances" ON leave_balances USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. Notices & Memos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          BIGSERIAL    PRIMARY KEY,
  title       TEXT         NOT NULL,
  content     TEXT,
  type        TEXT         DEFAULT 'General',
  priority    TEXT         DEFAULT 'Normal',
  author      TEXT,
  date        DATE,
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_notices" ON notices USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. Holidays ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id          BIGSERIAL    PRIMARY KEY,
  name        TEXT         NOT NULL,
  from_date   DATE,
  to_date     DATE,
  type        TEXT         DEFAULT 'Public',
  optional    BOOLEAN      DEFAULT false,
  data        JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_holidays" ON holidays USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. Policies ──────────────────────────────────────────────
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

-- ── 9. Policy Acknowledgments ────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_acks (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE policy_acks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_policy_acks" ON policy_acks USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 10. Expenses Ledger ──────────────────────────────────────
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

-- ── 11. Salary Advance History ───────────────────────────────
CREATE TABLE IF NOT EXISTS advances (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_advances" ON advances USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 12. Payroll History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_history (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_payroll" ON payroll_history USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 13. Salary Structures (full JSONB snapshot) ──────────────
CREATE TABLE IF NOT EXISTS salary_structures_ext (
  emp_id       BIGINT      PRIMARY KEY,
  data         JSONB       NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_structures_ext ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_salary_ext" ON salary_structures_ext USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 14. Projects / Site Master ───────────────────────────────
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

-- ── 15. Departments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_departments" ON departments USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 16. Dept Budgets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dept_budgets (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE dept_budgets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_dept_budgets" ON dept_budgets USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 17. Manpower Requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS manpower_requests (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE manpower_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_manpower" ON manpower_requests USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 18. Approval Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_logs (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_approval_logs" ON approval_logs USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 19. Exit & Off-boarding Records ─────────────────────────
CREATE TABLE IF NOT EXISTS exit_records (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE exit_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_exits" ON exit_records USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 20. Training Records ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_records (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_training" ON training_records USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 21. Induction Tasks (per-employee) ──────────────────────
CREATE TABLE IF NOT EXISTS induction_tasks (
  emp_id      BIGINT       PRIMARY KEY,
  tasks       JSONB        NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE induction_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_induction" ON induction_tasks USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 22. Performance / Feedback Records ──────────────────────
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

-- ── 23. Bonus Payments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_payments (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_bonus" ON bonus_payments USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 24. Recruitment Candidates ───────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_candidates" ON candidates USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 25. Compliance Manuals ───────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_manuals (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE compliance_manuals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_manuals" ON compliance_manuals USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 26. Statutory Updates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS statutory_updates (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE statutory_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_statutory" ON statutory_updates USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 27. Letter Templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS letter_templates (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_letter_templates" ON letter_templates USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 28. Employee Documents ───────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_docs (
  id          TEXT         PRIMARY KEY,
  emp_id      BIGINT,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE employee_docs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_employee_docs" ON employee_docs USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 29. Auth Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_logs (
  id          TEXT         PRIMARY KEY,
  data        JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_auth_logs" ON auth_logs USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 30. App Config (bulletin, biometric, gratuity, etc.) ─────
CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT         PRIMARY KEY,
  value       JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_app_config" ON app_config USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Done ──────────────────────────────────────────────────────
-- 30 tables. All data is Supabase-only. No localStorage fallbacks.
