-- ============================================================
-- Payroll Protection & Formula Locking Schema
-- ============================================================

-- 1. Configuration Table
CREATE TABLE IF NOT EXISTS payroll_formula_config (
  component_name TEXT PRIMARY KEY,
  formula_type TEXT NOT NULL, -- 'percentage_of_gross', 'percentage_of_basic', 'fixed_amount'
  formula_value NUMERIC NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  active_status BOOLEAN DEFAULT true,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial rules
INSERT INTO payroll_formula_config (component_name, formula_type, formula_value) VALUES
('Basic', 'percentage_of_gross', 50.00),
('DA', 'percentage_of_basic', 5.00),
('HRA', 'percentage_of_basic', 40.00),
('Washing Allowance', 'fixed_amount', 1000.00)
ON CONFLICT (component_name) DO NOTHING;

-- 2. Audit Log
CREATE TABLE IF NOT EXISTS payroll_formula_audit_log (
  id BIGSERIAL PRIMARY KEY,
  component_name TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- RLS
ALTER TABLE payroll_formula_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_config" ON payroll_formula_config;
CREATE POLICY "allow_all_read_config" ON payroll_formula_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_management_update_config" ON payroll_formula_config;
CREATE POLICY "allow_management_update_config" ON payroll_formula_config FOR ALL USING (true) WITH CHECK (true);
-- Note: In a production Supabase instance, update policy should check user role. We allow all here for ease of MVP development.

ALTER TABLE payroll_formula_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_audit" ON payroll_formula_audit_log;
CREATE POLICY "allow_all_audit" ON payroll_formula_audit_log USING (true) WITH CHECK (true);

-- 3. Centralized RPC for calculating base salary structure (Backend Only)
CREATE OR REPLACE FUNCTION calculate_salary_structure(
  p_gross_salary NUMERIC,
  p_conveyance NUMERIC DEFAULT 0,
  p_performance NUMERIC DEFAULT 0,
  p_special NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_basic_pct NUMERIC;
  v_da_pct NUMERIC;
  v_hra_pct NUMERIC;
  v_washing_fixed NUMERIC;
  
  v_basic NUMERIC;
  v_da NUMERIC;
  v_hra NUMERIC;
  v_washing NUMERIC;
  
  v_sum_standard NUMERIC;
  v_other NUMERIC;
BEGIN
  -- Read configs
  SELECT COALESCE((SELECT formula_value FROM payroll_formula_config WHERE component_name = 'Basic'), 50.00) INTO v_basic_pct;
  SELECT COALESCE((SELECT formula_value FROM payroll_formula_config WHERE component_name = 'DA'), 5.00) INTO v_da_pct;
  SELECT COALESCE((SELECT formula_value FROM payroll_formula_config WHERE component_name = 'HRA'), 40.00) INTO v_hra_pct;
  SELECT COALESCE((SELECT formula_value FROM payroll_formula_config WHERE component_name = 'Washing Allowance'), 1000.00) INTO v_washing_fixed;
  
  -- Calculate
  v_basic := ROUND(p_gross_salary * (v_basic_pct / 100.0));
  v_da := ROUND(v_basic * (v_da_pct / 100.0));
  v_hra := ROUND(v_basic * (v_hra_pct / 100.0));
  v_washing := v_washing_fixed;
  
  v_sum_standard := v_basic + v_da + v_hra + v_washing + p_conveyance + p_performance + p_special;
  v_other := GREATEST(0, p_gross_salary - v_sum_standard);
  
  RETURN jsonb_build_object(
    'basic', v_basic,
    'da', v_da,
    'hra', v_hra,
    'washingAllowance', v_washing,
    'otherManual', v_other,
    'gross', p_gross_salary,
    'conveyance', p_conveyance,
    'performance', p_performance,
    'special', p_special
  );
END;
$$;

-- 4. Trigger to Lock Generated Payroll
CREATE OR REPLACE FUNCTION prevent_payroll_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the old row had payrollGenerated = true, and the new row STILL has it true, prevent modifying financial data
  IF (OLD.data->>'payrollGenerated')::boolean = true AND (NEW.data->>'payrollGenerated')::boolean = true THEN
    -- Check if critical fields were modified
    IF (OLD.data->>'earnings')::jsonb != (NEW.data->>'earnings')::jsonb OR
       (OLD.data->>'deductions')::jsonb != (NEW.data->>'deductions')::jsonb OR
       (OLD.data->>'netPay') != (NEW.data->>'netPay') THEN
      RAISE EXCEPTION 'Payroll record is locked. You must explicitly unlock it (set payrollGenerated to false) before modifying financial records.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lock_payroll ON payroll_history;
CREATE TRIGGER trigger_lock_payroll
BEFORE UPDATE ON payroll_history
FOR EACH ROW
EXECUTE FUNCTION prevent_payroll_update();
