-- Add company and timezone columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
