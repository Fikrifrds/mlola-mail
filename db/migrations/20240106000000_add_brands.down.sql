-- Remove brand_id from templates
ALTER TABLE templates
  DROP COLUMN IF EXISTS brand_id;

-- Drop brands table
DROP INDEX IF EXISTS idx_brands_is_default;
DROP INDEX IF EXISTS idx_brands_user_id;
DROP TABLE IF EXISTS brands;
