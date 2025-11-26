-- Rollback: Drop sender_addresses table
DROP INDEX IF EXISTS idx_sender_addresses_user_default;
DROP INDEX IF EXISTS idx_sender_addresses_active;
DROP INDEX IF EXISTS idx_sender_addresses_default;
DROP INDEX IF EXISTS idx_sender_addresses_user_id;
DROP TABLE IF EXISTS sender_addresses;
