-- Добавление полей для времени оповещения
ALTER TABLE birthdays
ADD COLUMN notification_time TIME DEFAULT '09:00:00';

-- Создание таблицы для глобальных настроек
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Вставка дефолтного времени для оповещений
INSERT INTO settings (key, value)
VALUES ('default_notification_time', '09:00')
ON CONFLICT (key) DO NOTHING;

-- Разрешаем публичный доступ к таблице настроек
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to settings" ON settings;
CREATE POLICY "Allow public read access to settings" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to settings" ON settings;
CREATE POLICY "Allow public insert access to settings" ON settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to settings" ON settings;
CREATE POLICY "Allow public update access to settings" ON settings FOR UPDATE USING (true);
