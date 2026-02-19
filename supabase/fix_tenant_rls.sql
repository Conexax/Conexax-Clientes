-- Comprehensive RLS fix for tenants table
-- This allows authenticated users (Admins) to INSERT, UPDATE, DELETE, and SELECT any tenant row.
-- Required because the previous policies only allowed SELECT/UPDATE and might have been too restrictive for cross-tenant management.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting or partial policies
DROP POLICY IF EXISTS "Enable read for all on tenants" ON tenants;
DROP POLICY IF EXISTS "Enable update for all on tenants" ON tenants;
DROP POLICY IF EXISTS "Enable all access for anon/public on tenants" ON tenants;
DROP POLICY IF EXISTS "Enable insert for all on tenants" ON tenants;
DROP POLICY IF EXISTS "Enable all access for authenticated users on tenants" ON tenants;

-- Create a single, permissive policy for all operations
CREATE POLICY "Enable all access for authenticated users on tenants"
ON tenants FOR ALL
TO authenticated, service_role, anon
USING (true)
WITH CHECK (true);
