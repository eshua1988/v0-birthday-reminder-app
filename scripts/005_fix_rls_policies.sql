-- Удаляем старые политики с аутентификацией
DROP POLICY IF EXISTS "Users can view all birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can insert birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can update birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can delete birthdays" ON birthdays;

-- Создаем новые публичные политики (без требования аутентификации)
CREATE POLICY "Public can view all birthdays" 
  ON birthdays FOR SELECT 
  USING (true);

CREATE POLICY "Public can insert birthdays" 
  ON birthdays FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Public can update birthdays" 
  ON birthdays FOR UPDATE 
  USING (true);

CREATE POLICY "Public can delete birthdays" 
  ON birthdays FOR DELETE 
  USING (true);

-- Удаляем таблицу user_profiles, так как аутентификация больше не используется
DROP TABLE IF EXISTS user_profiles;
