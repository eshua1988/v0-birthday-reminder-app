-- Create table for storing FCM tokens
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON fcm_tokens;

-- Create RLS policies
CREATE POLICY "Users can view their own tokens"
  ON fcm_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON fcm_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON fcm_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON fcm_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
