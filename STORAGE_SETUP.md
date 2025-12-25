# 🖼️ Настройка Storage для аватаров в Supabase

## ⚠️ ВАЖНО: Инструкция по исправлению загрузки фото

Если фото профиля не загружается, следуйте этой инструкции.

---

## 📋 Быстрая настройка (5 минут)

### Шаг 1: Откройте Supabase Dashboard

```
https://supabase.com/dashboard/project/bwgzkqnnubawzvuxijjf/storage/buckets
```

### Шаг 2: Создайте bucket "avatars"

1. В разделе **Storage** нажмите **"New bucket"** или **"Create bucket"**
2. Заполните форму:
   - **Name**: `avatars` ⚠️ (точное название!)
   - **Public bucket**: ✅ **ДА** (обязательно включите!)
   - **File size limit**: `5242880` (5 MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`
3. Нажмите **"Create bucket"**

---

## 🔒 Шаг 3: Настройте политики безопасности (RLS Policies)

### Важно: Без этих политик загрузка не будет работать!

После создания бакета нажмите на **avatars** → вкладка **Policies** → **New Policy**

### Политика 1: Публичное чтение ✅
```sql
-- Policy name: Public avatars are readable
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Public avatars are readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Через UI:**
- Policy command: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'avatars'`

### Политика 2: Загрузка (Upload) ✅
```sql
-- Policy name: Users can upload own avatar
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Через UI:**
- Policy command: `INSERT`
- Target roles: `authenticated`CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
- WITH CHECK: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

### Политика 3: Обновление (Update) ✅
```sql
-- Policy name: Users can update own avatar
-- Operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Через UI:**
- Policy command: `UPDATE`
- Target roles: `authenticated`
- USING: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`
- WITH CHECK: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

### Политика 4: Удаление (Delete) ✅
```sql
-- Policy name: Users can delete own avatar
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Через UI:**
- Policy command: `DELETE`
- Target roles: `authenticated`
- USING: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

---

## 🧪 Тестирование

1. Откройте профиль: http://localhost:3000/profile
2. Нажмите **"Загрузить фото"**
3. Выберите изображение (макс 5MB, JPEG/PNG/GIF/WebP)
4. Дождитесь сообщения **"Фото профиля успешно обновлено!"**
5. Проверьте, что аватар отображается

---

## 🔧 Улучшения в коде

### Что было исправлено:
- ✅ Проверка существования bucket
- ✅ Валидация размера файла (макс 5MB)
- ✅ Валидация формата (JPEG, PNG, GIF, WebP)
- ✅ Уникальные имена файлов (с timestamp)
- ✅ Лучшая обработка ошибок
- ✅ Индикатор загрузки (spinner)
- ✅ Автоматическое обновление UI
- ✅ Удаление старых аватаров

---

## 🐛 Возможные проблемы

### "Bucket 'avatars' не найден"
**Причина**: Bucket создан, но с другим именем или не создан вообще  
**Решение**: 
1. Проверьте точное название: должно быть `avatars` (без кавычек)
2. Bucket должен быть в том же проекте Supabase
3. Попробуйте обновить страницу в браузере

### "403 Forbidden" / "Permission denied" / "Недостаточно прав"
**Причина**: Политики RLS не настроены или настроены неправильно  
**Решение**: 
1. Убедитесь, что созданы ВСЕ 4 политики (SELECT, INSERT, UPDATE, DELETE)
2. Проверьте правильность SQL-выражений в политиках
3. В политиках должно быть `auth.uid()::text` а не просто `auth.uid()`

### "Ошибка доступа. Проверьте настройки политик RLS"
**Причина**: Row Level Security блокирует операцию  
**Решение**:
1. Откройте Storage → avatars → Policies
2. Убедитесь что политика INSERT имеет правильное условие:
   ```
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```
3. Проверьте, что bucket публичный (Public bucket: Yes)

### "Размер файла не должен превышать 5MB"
➡️ Выберите файл меньшего размера

### "Разрешены только изображения"
➡️ Используйте JPEG, PNG, GIF или WebP

### Фото не отображается после загрузки
**Решение**:
1. Проверьте, что bucket публичный (Public bucket: Yes)
2. Очистите кеш браузера (Ctrl+F5)
3. Проверьте консоль браузера (F12) на наличие ошибок
4. Убедитесь, что политика SELECT создана для публичного доступа

### Загрузка работает, но старое фото не удаляется
**Это нормально** - старые файлы удаляются автоматически при следующей загрузке. Если хотите очистить вручную:
1. Откройте Storage → avatars
2. Найдите папку с вашим user_id
3. Удалите старые файлы вручную

---

## 🔍 Проверка настроек

### Как проверить, что bucket настроен правильно:

1. **Откройте Supabase Dashboard**:
   - Storage → Buckets
   - Должен быть bucket с именем `avatars`

2. **Проверьте настройки bucket**:
   - Нажмите на avatars
   - Configuration → Public bucket должен быть ✅

3. **Проверьте политики**:
   - Перейдите на вкладку Policies
   - Должно быть 4 политики:
     - `Public avatars are readable` (SELECT, public)
     - `Users can upload own avatar` (INSERT, authenticated)
     - `Users can update own avatar` (UPDATE, authenticated)
     - `Users can delete own avatar` (DELETE, authenticated)

4. **Тест загрузки через SQL Editor**:
   ```sql
   -- Проверка bucket
   SELECT * FROM storage.buckets WHERE name = 'avatars';
   
   -- Проверка политик
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

---

## ✅ Чеклист

- [ ] Bucket "avatars" создан
- [ ] Bucket публичный (Public: Yes)
- [ ] Политика SELECT создана
- [ ] Политика INSERT создана
- [ ] Политика UPDATE создана
- [ ] Политика DELETE создана
- [ ] Загрузка фото работает
- [ ] Фото отображается в профиле
- [ ] Фото отображается в sidebar

---

**Готово! Загрузка фото должна работать! 🎉**

Время настройки: ~5 минут
