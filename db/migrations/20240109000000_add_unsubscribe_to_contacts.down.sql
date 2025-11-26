DROP INDEX IF EXISTS idx_contacts_unsubscribe_token;
ALTER TABLE contacts 
DROP COLUMN IF EXISTS unsubscribe_token,
DROP COLUMN IF EXISTS unsubscribed_at;
