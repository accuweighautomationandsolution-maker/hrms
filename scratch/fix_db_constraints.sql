-- ============================================================
-- HRMS Fix: Remove FK constraint on user_profiles.id
-- Run this ONCE in your Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Step 1: Drop the foreign key constraint that forces user_profiles.id
--         to match an existing auth.users UUID.
--         This allows internal HRMS accounts to be created without 
--         Supabase Auth email confirmation.
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 2: Also fix emp_id column from BIGINT → TEXT
--         (fixes the original "invalid input syntax for type bigint" error)
ALTER TABLE user_profiles 
  ALTER COLUMN emp_id TYPE TEXT USING emp_id::TEXT;

-- Step 3: Verify both fixes
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Expected: emp_id should show "text" (not "bigint")

-- Also verify FK is gone:
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_profiles';

-- Expected: No row with constraint_type = 'FOREIGN KEY' for user_profiles_id_fkey
