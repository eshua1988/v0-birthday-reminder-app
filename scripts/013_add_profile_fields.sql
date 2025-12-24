-- Добавление полей для имени, фамилии и телефона в таблицу profiles

-- Добавляем новые колонки в profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Комментарии к колонкам
COMMENT ON COLUMN profiles.first_name IS 'Имя пользователя';
COMMENT ON COLUMN profiles.last_name IS 'Фамилия пользователя';
COMMENT ON COLUMN profiles.phone_number IS 'Номер телефона пользователя';
