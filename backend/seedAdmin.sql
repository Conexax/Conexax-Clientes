-- Insert Master Admin
-- Note: Password is plain text for this MVP as requested. In production, use Supabase Auth or bcrypt.

INSERT INTO users (email, password, role, name)
VALUES 
  ('arthur@conexax.com.br', '29arthur', 'CONEXX_ADMIN', 'Arthur Admin')
ON CONFLICT (email) DO NOTHING;
