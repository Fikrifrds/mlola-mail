ALTER TABLE emails ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON emails(campaign_id);
