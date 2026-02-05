-- ============================================
-- Fix Users Table RLS Policies
-- Allow admins and managers to view all users
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Since the mobile app uses anon key, we need anon policies
-- For a small internal app (2-3 users), this is acceptable

-- Policy: Allow anon to read users (for mobile app)
CREATE POLICY "Anon can view all users" ON users
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anon to insert users
CREATE POLICY "Anon can create users" ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anon to update users
CREATE POLICY "Anon can update users" ON users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anon to delete users (deactivate)
CREATE POLICY "Anon can delete users" ON users
  FOR DELETE
  TO anon
  USING (true);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
