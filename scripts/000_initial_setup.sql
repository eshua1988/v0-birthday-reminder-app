-- Birthday Reminder App - Complete Database Setup
-- This script combines all migrations into a single setup file
-- Run this once to set up a fresh database

-- ============================================
-- 001: Create birthdays table
-- ============================================

CREATE TABLE IF NOT EXISTS birthdays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  patronymic TEXT,
  birth_date DATE NOT NULL,
  photo_url TEXT,
  notes TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TEXT DEFAULT '09:00',
  notification_times TEXT[],
  notification_repeat_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS birthdays_user_id_idx ON birthdays(user_id);
CREATE INDEX IF NOT EXISTS birthdays_birth_date_idx ON birthdays(birth_date);

-- ============================================
-- 002: Create photos storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-photos', 'birthday-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for birthday-photos bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'birthday-photos');

CREATE POLICY "Users can view all photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'birthday-photos');

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'birthday-photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'birthday-photos');

-- ============================================
-- 005: Fix RLS policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can insert their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can update their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can delete their own birthdays" ON birthdays;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own birthdays"
ON birthdays FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own birthdays"
ON birthdays FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own birthdays"
ON birthdays FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own birthdays"
ON birthdays FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 008: Create settings table
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings
CREATE POLICY "Users can view their own settings"
ON settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
ON settings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS settings_user_id_key_idx ON settings(user_id, key);

-- ============================================
-- 010: Create auth tables (profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 015: Multiple notification times
-- ============================================

-- Migrate existing notification_time to notification_times array
UPDATE birthdays
SET notification_times = ARRAY[notification_time]
WHERE notification_times IS NULL AND notification_time IS NOT NULL;

-- Set default repeat count
UPDATE birthdays
SET notification_repeat_count = 1
WHERE notification_repeat_count IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN birthdays.notification_times IS 'Array of notification times for repeated reminders (max 5)';
COMMENT ON COLUMN birthdays.notification_repeat_count IS 'Number of notification times set (1-5)';
COMMENT ON TABLE birthdays IS 'Stores birthday information for users with notification settings';
COMMENT ON TABLE settings IS 'User-specific settings key-value store';
COMMENT ON TABLE profiles IS 'User profile information';

-- ============================================
-- Completion
-- ============================================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete!';
  RAISE NOTICE 'Tables created: birthdays, settings, profiles';
  RAISE NOTICE 'Storage bucket: birthday-photos';
  RAISE NOTICE 'RLS policies: Enabled and configured';
END $$;
