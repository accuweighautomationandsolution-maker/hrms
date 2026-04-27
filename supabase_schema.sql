-- HRMS Supabase Schema Setup
-- Run these in your Supabase SQL Editor

-- 1. Employees Table
CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  emp_code TEXT UNIQUE NOT NULL,
  biometric_code TEXT,
  designation TEXT,
  department TEXT,
  joining_date DATE,
  status TEXT DEFAULT 'Active',
  role TEXT DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance Table
CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  emp_id BIGINT REFERENCES employees(id),
  date DATE NOT NULL,
  punch_in TIMESTAMPTZ,
  punch_out TIMESTAMPTZ,
  status TEXT,
  location TEXT,
  UNIQUE(emp_id, date)
);

-- 3. Leave Requests
CREATE TABLE leave_requests (
  id BIGSERIAL PRIMARY KEY,
  emp_id BIGINT REFERENCES employees(id),
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notices & Memos
CREATE TABLE notices (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'Normal',
  created_by BIGINT REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Salary Structures
CREATE TABLE salary_structures (
  emp_id BIGINT PRIMARY KEY REFERENCES employees(id),
  base_salary NUMERIC DEFAULT 0,
  hra NUMERIC DEFAULT 0,
  conveyance NUMERIC DEFAULT 0,
  special_allowance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

-- Basic Policy: Employees can read all employees, but only update themselves
CREATE POLICY "Public employees read" ON employees FOR SELECT USING (true);
