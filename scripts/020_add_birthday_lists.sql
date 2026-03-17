-- Create birthday_lists table for grouping members into named lists/folders
CREATE TABLE IF NOT EXISTS birthday_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add list_id column to birthdays so each member can belong to a list
ALTER TABLE birthdays ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES birthday_lists(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE birthday_lists ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own lists
CREATE POLICY "Users can manage their own lists"
  ON birthday_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_birthday_lists_user_id ON birthday_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_list_id ON birthdays(list_id);
