-- Create settings table for storing user preferences
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Добавлены DROP POLICY IF EXISTS перед созданием политик для избежания ошибок при повторном запуске
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON settings;

-- Политики для использования user_id вместо публичного доступа
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);
