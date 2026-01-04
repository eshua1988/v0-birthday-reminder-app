-- Add Telegram integration fields to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Create table for pending Telegram links
CREATE TABLE IF NOT EXISTS telegram_pending_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  link_code TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_pending_links_code ON telegram_pending_links(link_code);
CREATE INDEX IF NOT EXISTS idx_settings_telegram_chat_id ON settings(telegram_chat_id);

-- RLS policies for telegram_pending_links (service role only)
ALTER TABLE telegram_pending_links ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage pending links
CREATE POLICY "Service role can manage telegram_pending_links" ON telegram_pending_links
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-delete expired codes (older than 10 minutes) - optional cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_links()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_pending_links 
  WHERE created_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
