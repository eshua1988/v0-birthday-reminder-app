# Миграция: Добавление кастомных полей

## Что изменилось
- Добавлена колонка `custom_fields` (JSONB) в таблицу `birthdays`
- Теперь можно сохранять любые дополнительные поля (телефон, email, адрес, заметки и т.д.)

## Как применить

### Вариант 1: Через Supabase Dashboard
1. Откройте https://supabase.com → ваш проект
2. SQL Editor → New Query
3. Скопируйте содержимое файла `scripts/017_add_custom_fields.sql`
4. Нажмите RUN

### Вариант 2: Через CLI (если установлен Supabase CLI)
```bash
supabase db execute < scripts/017_add_custom_fields.sql
```

## Проверка
После выполнения миграции проверьте:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'birthdays' AND column_name = 'custom_fields';
```

Должна вернуться строка:
```
custom_fields | jsonb
```

## Откат (если нужно)
```sql
ALTER TABLE birthdays DROP COLUMN custom_fields;
```
