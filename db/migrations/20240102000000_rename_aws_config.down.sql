-- Rollback: Rename email_config back to aws_config
ALTER TABLE users RENAME COLUMN email_config TO aws_config;
