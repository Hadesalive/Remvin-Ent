-- ============================================
-- Fix Admin User and Login Function
-- This script fixes the password column issue
-- ============================================

-- Step 1: Check what password column exists
-- Run this first to see your table structure:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name LIKE '%password%'
ORDER BY ordinal_position;

-- Step 2: Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Add password_hash column if it doesn't exist
-- If you have a 'password' column, we'll rename it or add password_hash
DO $$
BEGIN
  -- Check if password_hash exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    -- If password column exists, rename it to password_hash
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
      ALTER TABLE users RENAME COLUMN password TO password_hash;
    ELSE
      -- Add password_hash column if neither exists
      ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;
  END IF;
END $$;

-- Step 4: Recreate the login function with correct column name
DROP FUNCTION IF EXISTS mobile_user_login(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION mobile_user_login(
  p_username VARCHAR,
  p_password VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_password_match BOOLEAN;
BEGIN
  -- Find user by username
  SELECT * INTO v_user
  FROM users
  WHERE username = p_username
    AND is_active = true;

  -- If user not found, return error
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;

  -- Check password using bcrypt (now using password_hash column)
  SELECT (v_user.password_hash = crypt(p_password, v_user.password_hash)) INTO v_password_match;

  IF NOT v_password_match THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;

  -- Update last login
  UPDATE users
  SET last_login = NOW()
  WHERE id = v_user.id;

  -- Return user data
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'fullName', v_user.full_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'role', v_user.role,
      'employeeId', v_user.employee_id,
      'isActive', v_user.is_active,
      'createdAt', v_user.created_at,
      'updatedAt', v_user.updated_at,
      'lastLogin', NOW()
    )
  );
END;
$$;

-- Step 5: Delete existing admin user and recreate with correct password
DELETE FROM users WHERE username = 'admin';

INSERT INTO users (
  username,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'admin',
  crypt('admin123', gen_salt('bf', 10)),
  'Administrator',
  'admin',
  true,
  NOW(),
  NOW()
);

-- Step 6: Test the login function
SELECT mobile_user_login('admin', 'admin123') as login_test;

-- Step 7: Verify the user was created
SELECT 
  id,
  username,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE username = 'admin';
