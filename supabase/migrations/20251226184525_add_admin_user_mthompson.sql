-- Add admin user mthompson@ticketflo.org
INSERT INTO admin_users (email, password_hash, is_active, created_at)
VALUES (
  'mthompson@ticketflo.org',
  '$2b$10$FeayzK83Q0yybGFfKj5PReVa34JkqXtdQQJTuPurjrcv6g6Dh01GW',
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true;
