-- Добавление поля avatar_url в таблицу profiles
-- ВАЖНО: Бакет 'avatars' нужно создать вручную в Supabase Dashboard:
-- 1. Перейдите в Storage в Supabase Dashboard
-- 2. Нажмите "New bucket"
-- 3. Имя: avatars
-- 4. Установите Public bucket: true
-- 5. Настройте политики безопасности через UI

-- Добавляем поле для URL аватара
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Обновляем timestamp
UPDATE public.profiles SET updated_at = NOW() WHERE avatar_url IS NULL;
