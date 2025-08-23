-- Create initial admin user for secure admin portal
-- Password will be 'AdminPass123!' (hashed with bcrypt)
-- You should change this password after first login

INSERT INTO public.admin_users (
  id,
  email,
  password_hash,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@ticketflo.org',
  '$2b$10$rZ9qhJxUlMZB3k4P6vF5ue8YvHxF7jKnJ5yV3GqF2nV8wN7xE1sWq',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

-- Log the creation of the initial admin user
INSERT INTO public.security_audit_log (
  event_type,
  event_data,
  ip_address,
  user_agent
) VALUES (
  'initial_admin_created',
  jsonb_build_object(
    'email', 'admin@ticketflo.org',
    'created_by', 'migration'
  ),
  '127.0.0.1'::inet,
  'system-migration'
);