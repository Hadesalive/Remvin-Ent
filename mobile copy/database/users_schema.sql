-- ============================================
-- Users Table Schema
-- Simple internal app for 2-3 users
-- ============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
  employee_id VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data (if needed)
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Allow service role to do everything (for RPC functions)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- RPC Functions
-- ============================================

-- Function: mobile_user_login
-- Authenticates a user and returns user data
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

  -- Check password (using bcrypt)
  -- Note: You'll need to install pgcrypto extension if not already installed
  -- CREATE EXTENSION IF NOT EXISTS pgcrypto;
  SELECT (password_hash = crypt(p_password, password_hash)) INTO v_password_match;

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
      'lastLogin', v_user.last_login
    )
  );
END;
$$;

-- Function: mobile_get_user
-- Gets user by ID
CREATE OR REPLACE FUNCTION mobile_get_user(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

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
      'lastLogin', v_user.last_login
    )
  );
END;
$$;

-- Function: mobile_create_user
-- Creates a new user with hashed password
CREATE OR REPLACE FUNCTION mobile_create_user(
  p_username VARCHAR,
  p_password VARCHAR,
  p_full_name VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_role VARCHAR DEFAULT 'cashier',
  p_employee_id VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already exists'
    );
  END IF;

  -- Hash the password using bcrypt
  -- Generate a salt and hash the password
  v_password_hash := crypt(p_password, gen_salt('bf', 10));

  -- Insert new user
  INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    phone,
    role,
    employee_id,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_username,
    v_password_hash,
    p_full_name,
    p_email,
    p_phone,
    p_role,
    p_employee_id,
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Return created user
  RETURN mobile_get_user(v_user_id);
END;
$$;

-- Function: mobile_change_password
-- Changes a user's password
CREATE OR REPLACE FUNCTION mobile_change_password(
  p_user_id UUID,
  p_current_password VARCHAR,
  p_new_password VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_password_match BOOLEAN;
  v_new_password_hash TEXT;
BEGIN
  -- Get user
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Verify current password
  SELECT (password_hash = crypt(p_current_password, password_hash)) INTO v_password_match;

  IF NOT v_password_match THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Current password is incorrect'
    );
  END IF;

  -- Hash new password
  v_new_password_hash := crypt(p_new_password, gen_salt('bf', 10));

  -- Update password
  UPDATE users
  SET 
    password_hash = v_new_password_hash,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Password changed successfully'
  );
END;
$$;

-- ============================================
-- Enable pgcrypto extension for password hashing
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Create initial admin user
-- Default credentials: username: admin, password: admin123
-- IMPORTANT: Change this password after first login!
-- ============================================
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
) ON CONFLICT (username) DO NOTHING;
