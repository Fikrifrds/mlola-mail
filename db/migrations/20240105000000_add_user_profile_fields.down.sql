-- Remove company and timezone columns from users table
ALTER TABLE users
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS timezone;
