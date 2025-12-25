-- ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ ДЛЯ ЗАПУСКА ПРИЛОЖЕНИЯ
-- Скопируйте весь этот скрипт и выполните в Supabase SQL Editor
-- https://supabase.com/dashboard/project/bwgzkqnnubawzvuxijjf/sql

-- 1. Создание таблицы birthdays (если не существует)
CREATE TABLE IF NOT EXISTS public.birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  birth_date DATE NOT NULL,
  phone TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS birthdays_birth_date_idx ON public.birthdays(birth_date);
CREATE INDEX IF NOT EXISTS birthdays_name_idx ON public.birthdays(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON public.birthdays(user_id);

ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow anonymous delete access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.birthdays;
DROP POLICY IF EXISTS "Allow anonymous update access" ON public.birthdays;
DROP POLICY IF EXISTS "Users can view their own birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Users can insert their own birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Users can update their own birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Users can delete their own birthdays" ON public.birthdays;

-- Новые политики для birthdays
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

-- 2. Создание таблицы profiles (КРИТИЧЕСКИ ВАЖНО!)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  google_drive_folder_id TEXT,
  google_access_token TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Политики для profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Функция для автоматического создания профиля
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

-- 4. Создание таблицы settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.settings;

-- Политики для settings
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

-- 5. Создание Storage bucket для аватаров (если не существует)
-- ВАЖНО: Это нужно сделать вручную в UI!
-- Supabase Dashboard → Storage → Create bucket:
-- - Name: avatars
-- - Public bucket: Yes (включить!)

-- ✅ ГОТОВО! Теперь приложение должно работать.
-- После выполнения этого скрипта:
-- 1. Обновите страницу в браузере (Ctrl+F5)
-- 2. Войдите в аккаунт
-- 3. Создайте bucket 'avatars' в Storage (если еще не создан)
