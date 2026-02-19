-- Comprehensive RLS fix for users table
-- This allows authenticated users (Admins) to INSERT, UPDATE, SELECT any user row.
-- Essential for "saveTenant" to function, as it upserts the tenant owner's user record.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Enable all access for authenticated users on users" ON users;
DROP POLICY IF EXISTS "Enable read for all on users" ON users;
DROP POLICY IF EXISTS "Enable update for all on users" ON users;
DROP POLICY IF EXISTS "Enable insert for all on users" ON users;

-- Create a single, permissive policy for all operations
CREATE POLICY "Enable all access for authenticated users on users"
ON users FOR ALL
TO authenticated, service_role, anon
USING (true)
WITH CHECK (true);
