-- ====================================================================
-- HRMS Fix: Change user_profiles.emp_id from BIGINT to TEXT
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This is OPTIONAL but recommended for full backward compatibility.
-- The app code has already been fixed to no longer require this.
-- ====================================================================

-- Step 1: Change column type from BIGINT to TEXT
ALTER TABLE user_profiles 
  ALTER COLUMN emp_id TYPE TEXT USING emp_id::TEXT;

-- Step 2: Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'emp_id';

-- Expected output: emp_id | text
