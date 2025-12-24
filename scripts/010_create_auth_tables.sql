-- Создание таблиц для аутентификации и связи пользователей с их данными

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  google_drive_folder_id TEXT,
  google_access_token TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политики RLS для профилей
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Триггер для создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Обновление таблицы birthdays для связи с пользователями
ALTER TABLE public.birthdays ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON public.birthdays(user_id);

-- Удаление старых публичных политик
DROP POLICY IF EXISTS "Allow anonymous delete access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous update access" ON public.birthdays;
DROP POLICY IF EXISTS "Public can delete birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Public can insert birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Public can update birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Public can view all birthdays" ON public.birthdays;

-- Новые политики RLS для birthdays (только для авторизованных пользователей)
CREATE POLICY "Users can view their own birthdays"
  ON public.birthdays FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own birthdays"
  ON public.birthdays FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own birthdays"
  ON public.birthdays FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own birthdays"
  ON public.birthdays FOR DELETE
  USING (auth.uid() = user_id);

-- Обновление таблицы settings для связи с пользователями
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- Удаление старых публичных политик для settings
DROP POLICY IF EXISTS "Allow public insert access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update settings" ON public.settings;

-- Новые политики RLS для settings
CREATE POLICY "Users can view their own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.settings FOR DELETE
  USING (auth.uid() = user_id);
