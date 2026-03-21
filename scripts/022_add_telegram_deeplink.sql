-- Allow deep link tokens (no chat_id yet when creating the token)
ALTER TABLE telegram_pending_links ALTER COLUMN chat_id DROP NOT NULL;

-- Add user_id for deep link flow: token is created pre-linked to an app user
ALTER TABLE telegram_pending_links ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_telegram_pending_links_user_id ON telegram_pending_links(user_id);
