-- Update default notification time and migrate existing records from 09:00 -> 08:00
-- Run this migration against your database with care. If this project is live, prefer applying via a proper migration tool or creating a safe rollback.

BEGIN;

-- Change default on birthdays table
ALTER TABLE birthdays
  ALTER COLUMN notification_time SET DEFAULT '08:00:00';

-- Update existing rows that currently have 09:00/09:00:00
UPDATE birthdays
  SET notification_time = '08:00:00'
  WHERE notification_time = '09:00' OR notification_time = '09:00:00';

-- Also update global default setting if present
UPDATE settings
  SET value = '08:00'
  WHERE key = 'default_notification_time' AND value IN ('09:00', '09:00:00');

COMMIT;
