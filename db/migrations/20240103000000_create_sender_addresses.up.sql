-- Create sender_addresses table
CREATE TABLE IF NOT EXISTS sender_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  smtp_password VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sender_addresses_user_id ON sender_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_addresses_default ON sender_addresses(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_sender_addresses_active ON sender_addresses(is_active);

-- Ensure only one default sender per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sender_addresses_user_default 
  ON sender_addresses(user_id) 
  WHERE is_default = true;
