-- RPC function to update tenant details with admin privileges (Security Definer)
-- This bypasses RLS policies on the tenants table for the specific fields.

CREATE OR REPLACE FUNCTION admin_update_tenant(
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
