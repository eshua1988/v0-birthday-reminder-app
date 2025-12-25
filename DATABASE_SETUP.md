# 🗄️ Настройка базы данных Supabase

## ❌ Ошибка: "Error fetching birthdays"

Если вы видите ошибку `[v0] Error fetching birthdays: {}`, это означает, что таблицы в базе данных не настроены или не хватает колонки `user_id`.

## ❌ Ошибка: "Profile update error"

Если вы видите ошибку `[v0] Profile update error: {}` при попытке загрузить фото профиля, это означает, что:
- Таблица `profiles` не создана
- Отсутствуют RLS политики для таблицы `profiles`
- Профиль для текущего пользователя не был автоматически создан

---

## 🔧 Быстрое исправление

### Шаг 1: Откройте SQL Editor в Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект (bwgzkqnnubawzvuxijjf)
3. Перейдите в **SQL Editor** (левое меню)

### Шаг 2: Выполните SQL скрипты по порядку

Скопируйте и выполните следующие скрипты **в указанном порядке**:

#### 1️⃣ Создание таблицы birthdays
```sql
-- scripts/001_create_birthdays_table.sql
CREATE TABLE IF NOT EXISTS birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  birth_date DATE NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS birthdays_birth_date_idx ON birthdays(birth_date);
CREATE INDEX IF NOT EXISTS birthdays_name_idx ON birthdays(last_name, first_name);
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
```

#### 2️⃣ Создание таблицы settings
```sql
-- scripts/008_create_settings_table.sql
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

#### 3️⃣ **ВАЖНО!** Добавление user_id и настройка безопасности
```sql
-- scripts/010_create_auth_tables.sql

-- Создание таблицы профилей
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  google_drive_folder_id TEXT,
  google_access_token TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политики для профилей
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Триггер для автоматического создания профиля
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ⚠️ КРИТИЧЕСКИ ВАЖНО: Добавление user_id к birthdays
ALTER TABLE public.birthdays ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
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

-- Новые политики для birthdays (только свои записи)
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

-- Обновление user_id для settings
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_user_id_key_key;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- Удаление старых публичных политик settings
DROP POLICY IF EXISTS "Allow public insert access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update settings" ON public.settings;

-- Новые политики для settings
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
```

#### 4️⃣ Добавление дополнительных полей к профилю
```sql
-- scripts/013_add_profile_fields.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### Шаг 3: Проверка

После выполнения скриптов проверьте структуру таблицы:

```sql
-- Проверка структуры birthdays
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'birthdays'
ORDER BY ordinal_position;

-- Должна быть колонка user_id!

-- Проверка политик
SELECT * FROM pg_policies WHERE tablename = 'birthdays';
```

---

## 🔍 Диагностика проблем

### Проверка 1: Существует ли таблица?
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('birthdays', 'profiles', 'settings');
```

### Проверка 2: Есть ли колонка user_id?
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'birthdays' AND column_name = 'user_id';
```
Если результат пустой - колонки нет, выполните скрипт `010_create_auth_tables.sql`!

### Проверка 3: Настроены ли RLS политики?
```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'birthdays';
```

Должно быть 4 политики:
- `Users can view their own birthdays` (SELECT)
- `Users can insert their own birthdays` (INSERT)
- `Users can update their own birthdays` (UPDATE)
- `Users can delete their own birthdays` (DELETE)

---

## 📝 Что делают скрипты

1. **001_create_birthdays_table.sql** - создает базовую таблицу birthdays
2. **008_create_settings_table.sql** - создает таблицу настроек
3. **010_create_auth_tables.sql** - **САМЫЙ ВАЖНЫЙ!**
   - Добавляет колонку `user_id` к birthdays и settings
   - Создает таблицу profiles
   - Настраивает RLS политики (каждый пользователь видит только свои записи)
   - Создает триггер для автоматического создания профиля
4. **013_add_profile_fields.sql** - добавляет дополнительные поля к профилю

---

## ✅ После выполнения

1. Обновите страницу в браузере (Ctrl+F5)
2. Войдите в аккаунт
3. Ошибка должна исчезнуть!

Если ошибка осталась, откройте консоль браузера (F12) и отправьте полный текст ошибки - теперь она будет более подробной.

---

## 🆘 Быстрая команда для выполнения всех скриптов

Если хотите выполнить все сразу, скопируйте содержимое следующих файлов в SQL Editor:

1. `scripts/001_create_birthdays_table.sql`
2. `scripts/008_create_settings_table.sql`
3. `scripts/010_create_auth_tables.sql` ⚠️ **ОБЯЗАТЕЛЬНО!**
4. `scripts/013_add_profile_fields.sql`

В указанном порядке!

---

## 👤 Проверка профиля пользователя

### Если ошибка "Profile update error"

После выполнения всех скриптов проверьте, создан ли профиль:

```sql
-- Проверка существующих профилей
SELECT id, email, first_name, last_name, avatar_url, created_at
FROM public.profiles;
```

Если профиля нет, он должен создаться автоматически при следующем входе благодаря триггеру `on_auth_user_created`.

### Если профиль не создается автоматически

Создайте профиль вручную:

```sql
-- Замените USER_ID и USER_EMAIL на ваши данные
-- Получить ID можно из консоли браузера: console.log("[v0] User loaded:", user.id)
INSERT INTO public.profiles (id, email)
VALUES ('YOUR_USER_ID_HERE', 'your.email@example.com')
ON CONFLICT (id) DO NOTHING;
```

### Проверка триггера

Убедитесь, что триггер создан:

```sql
-- Проверка триггеров
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created';
```

Если триггера нет, выполните снова часть скрипта `010_create_auth_tables.sql` с функцией и триггером.

---

## 🧪 Полная проверка после настройки

Выполните все проверки:

```sql
-- 1. Проверка таблиц
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('birthdays', 'profiles', 'settings')
ORDER BY table_name;

-- 2. Проверка структуры birthdays
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'birthdays' AND column_name = 'user_id';

-- 3. Проверка структуры profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Проверка RLS политик для birthdays
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'birthdays';

-- 5. Проверка RLS политик для profiles
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 6. Проверка вашего профиля (замените на ваш ID)
SELECT * FROM public.profiles WHERE id = auth.uid();
```

Если все проверки прошли успешно:
- ✅ 3 таблицы найдены
- ✅ Колонка `user_id` существует в `birthdays`
- ✅ По 4 политики для `birthdays`
- ✅ По 3 политики для `profiles`
- ✅ Ваш профиль найден

Значит база данных настроена правильно! 🎉

