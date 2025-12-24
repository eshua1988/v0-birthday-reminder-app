-- Create the birthdays table for storing church member birthday information
CREATE TABLE IF NOT EXISTS birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  birth_date DATE NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries by birth date
CREATE INDEX IF NOT EXISTS birthdays_birth_date_idx ON birthdays(birth_date);

-- Create an index for name searches
CREATE INDEX IF NOT EXISTS birthdays_name_idx ON birthdays(last_name, first_name);

-- Allow public access to all operations (no authentication required)
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read all birthdays
CREATE POLICY "Allow anonymous read access" ON birthdays
  FOR SELECT
  USING (true);

-- Allow anonymous users to insert birthdays
CREATE POLICY "Allow anonymous insert access" ON birthdays
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous users to update birthdays
CREATE POLICY "Allow anonymous update access" ON birthdays
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete birthdays
CREATE POLICY "Allow anonymous delete access" ON birthdays
  FOR DELETE
  USING (true);
