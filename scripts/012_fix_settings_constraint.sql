-- Удаляем старый constraint на уникальность только key
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;

-- Убеждаемся что есть правильный constraint на пару (user_id, key)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'settings_user_id_key_key'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT settings_user_id_key_key UNIQUE (user_id, key);
  END IF;
END $$;
