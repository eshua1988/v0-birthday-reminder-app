# Настройка Storage для аватаров в Supabase

## Автоматическая настройка (через код не работает)

Supabase не позволяет создавать Storage buckets через SQL из-за ограничений прав доступа.
Вам нужно создать бакет вручную через Dashboard.

## Пошаговая инструкция

### Шаг 1: Создание бакета

1. Откройте Supabase Dashboard для вашего проекта
2. Перейдите в раздел **Storage** (иконка папки в левой панели)
3. Нажмите кнопку **"New bucket"**
4. Заполните форму:
   - **Name**: `avatars`
   - **Public bucket**: ✅ (включите эту опцию)
5. Нажмите **"Create bucket"**

### Шаг 2: Настройка политик безопасности

После создания бакета нажмите на него и перейдите в раздел **Policies**.

#### Политика 1: Просмотр всех аватаров
- **Policy name**: `Users can view all avatars`
- **Allowed operation**: SELECT
- **Policy definition**: 
```sql
bucket_id = 'avatars'
```

#### Политика 2: Загрузка своего аватара
- **Policy name**: `Users can upload their own avatar`
- **Allowed operation**: INSERT
- **Policy definition**: 
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Политика 3: Обновление своего аватара
- **Policy name**: `Users can update their own avatar`
- **Allowed operation**: UPDATE
- **Policy definition**: 
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Политика 4: Удаление своего аватара
- **Policy name**: `Users can delete their own avatar`
- **Allowed operation**: DELETE
- **Policy definition**: 
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

### Шаг 3: Проверка

После настройки политик, приложение сможет:
- ✅ Загружать аватары пользователей
- ✅ Отображать аватары всем пользователям (публичный доступ)
- ✅ Разрешать пользователям изменять только свои аватары
- ✅ Разрешать пользователям удалять только свои аватары

### Важно

- Имя бакета должно быть точно `avatars`
- Бакет должен быть публичным (`Public bucket: true`)
- Все 4 политики безопасности обязательны для работы функционала

Без настройки Storage загрузка аватаров работать не будет!
