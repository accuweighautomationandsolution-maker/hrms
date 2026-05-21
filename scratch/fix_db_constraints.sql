-- ============================================================
-- HRMS Fix: Full database fix script
-- Run this ONCE in your Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Fix 1: Remove the FK constraint that forces user_profiles.id
--         to match an existing auth.users UUID.
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Fix 2: Change emp_id from BIGINT to TEXT
--         (emp_id now stores base64 password hash for Shadow Auth login)
ALTER TABLE user_profiles 
  ALTER COLUMN emp_id TYPE TEXT USING emp_id::TEXT;

-- ============================================================
-- IMPORTANT: For users already created WITHOUT a password hash in emp_id
-- (i.e., users created before this fix), you need to use the 
-- "Reset Password" button in the HRMS User Management page.
-- That will update their emp_id with the new password hash.
--
-- OR manually set it here with:
-- UPDATE user_profiles 
-- SET emp_id = encode(convert_to('YourPassword@123', 'UTF8'), 'base64')
-- WHERE email = 'user@example.com';
-- ============================================================

-- Verify the fixes:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check constraints:
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_profiles';
