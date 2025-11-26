ALTER TABLE contacts 
ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN unsubscribe_token VARCHAR(255);

CREATE UNIQUE INDEX idx_contacts_unsubscribe_token ON contacts(unsubscribe_token);
