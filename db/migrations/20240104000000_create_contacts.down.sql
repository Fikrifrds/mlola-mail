-- Rollback: Drop contacts table
DROP INDEX IF EXISTS idx_contacts_tags;
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_contacts_user_id;
DROP TABLE IF EXISTS contacts;
