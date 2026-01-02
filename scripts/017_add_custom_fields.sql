-- Add custom_fields column to birthdays table for storing additional dynamic fields
ALTER TABLE birthdays 
ADD COLUMN IF NOT EXISTS custom_fields jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_birthdays_custom_fields ON birthdays USING gin (custom_fields);

-- Add comment
COMMENT ON COLUMN birthdays.custom_fields IS 'JSON object storing custom fields like phone, email, address, notes, etc.';
