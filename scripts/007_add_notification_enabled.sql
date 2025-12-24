-- Добавление колонки для включения/отключения оповещений
ALTER TABLE birthdays
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- Обновление таблицы settings для добавления глобального переключателя
INSERT INTO settings (key, value)
VALUES ('notifications_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
