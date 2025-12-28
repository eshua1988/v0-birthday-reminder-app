-- Add service role policies for server-side access (cron jobs)
-- This allows server-side API routes to read tokens and birthdays without user authentication

-- FCM Tokens: Allow service role to read all tokens
DROP POLICY IF EXISTS "Service role can read all tokens" ON fcm_tokens;
CREATE POLICY "Service role can read all tokens"
  ON fcm_tokens FOR SELECT
  USING (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Birthdays: Allow service role to read all birthdays
DROP POLICY IF EXISTS "Service role can read all birthdays" ON birthdays;
CREATE POLICY "Service role can read all birthdays"
  ON birthdays FOR SELECT
  USING (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Settings: Allow service role to read all settings
DROP POLICY IF EXISTS "Service role can read all settings" ON settings;
CREATE POLICY "Service role can read all settings"
  ON settings FOR SELECT
  USING (true); -- Service role bypasses RLS, but explicit policy for clarity
