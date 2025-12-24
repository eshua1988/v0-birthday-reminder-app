-- Add notification_times and notification_repeat_count columns to birthdays table
ALTER TABLE birthdays
ADD COLUMN IF NOT EXISTS notification_times TEXT[],
ADD COLUMN IF NOT EXISTS notification_repeat_count INTEGER DEFAULT 1;

-- Migrate existing notification_time to notification_times array
UPDATE birthdays
SET notification_times = ARRAY[notification_time]
WHERE notification_times IS NULL;

-- Set default repeat count
UPDATE birthdays
SET notification_repeat_count = 1
WHERE notification_repeat_count IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN birthdays.notification_times IS 'Array of notification times for repeated reminders (max 5)';
COMMENT ON COLUMN birthdays.notification_repeat_count IS 'Number of notification times set (1-5)';
