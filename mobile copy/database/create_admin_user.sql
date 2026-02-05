-- ============================================
-- Create Admin User Script
-- Run this if you already have the users table created
-- ============================================

-- Ensure pgcrypto extension is enabled (if not already)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create initial admin user
-- Default credentials: username: admin, password: admin123
-- IMPORTANT: Change this password after first login!
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

-- Verify the user was created
SELECT 
  id,
  username,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE username = 'admin';
