-- "Magic Fix" Script: RPCs to bypass RLS for Tenant and User management independently.

-- 1. TENANT UPDATE RPC (Security Definer)
CREATE OR REPLACE FUNCTION admin_update_tenant_v2(
  _id uuid,
  _name text,
  _owner_email text,
  _yampi_alias text,
  _yampi_token text,
  _yampi_secret text,
  _yampi_proxy_url text,
  _company_percentage numeric,
  _logo_url text,
  _document text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tenants
  SET 
    name = _name,
    owner_email = _owner_email,
    yampi_alias = _yampi_alias,
    yampi_token = _yampi_token,
    yampi_secret = _yampi_secret,
    yampi_proxy_url = _yampi_proxy_url,
    company_percentage = _company_percentage,
    logo_url = _logo_url,
    document = _document,
    updated_at = now()
  WHERE id = _id;
END;
$$;

-- 2. USER UPSERT RPC (Security Definer)
-- Ensures we can link the user to the tenant and update their password/role without RLS blocking.
CREATE OR REPLACE FUNCTION admin_upsert_user_owner(
  _id uuid,
  _email text,
  _tenant_id uuid,
  _name text,
  _password text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists
  IF EXISTS (SELECT 1 FROM users WHERE id = _id OR email = _email) THEN
      UPDATE users
      SET
        tenant_id = _tenant_id,
        name = COALESCE(_name, name),
        password = COALESCE(_password, password), -- Only update if provided
        role = 'client_admin' -- Force role
      WHERE id = _id OR email = _email;
  ELSE
      INSERT INTO users (id, email, tenant_id, name, password, role)
      VALUES (
        COALESCE(_id, gen_random_uuid()),
        _email,
        _tenant_id,
        _name,
        COALESCE(_password, '123456'),
        'client_admin'
      );
  END IF;
END;
$$;
