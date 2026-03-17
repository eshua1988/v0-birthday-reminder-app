-- Prayer warriors: people who do the praying
CREATE TABLE IF NOT EXISTS prayer_warriors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prayer_warriors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own prayer_warriors" ON prayer_warriors
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prayer_warriors_user ON prayer_warriors(user_id);

-- Prayer assignments: monthly assignments of recipients to warriors
CREATE TABLE IF NOT EXISTS prayer_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warrior_id UUID NOT NULL REFERENCES prayer_warriors(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_id UUID,   -- references birthdays(id), nullable (if record deleted)
  assigned_month TEXT NOT NULL, -- format: YYYY-MM  e.g. 2026-03
  cycle_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prayer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own prayer_assignments" ON prayer_assignments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prayer_assignments_user_month
  ON prayer_assignments(user_id, assigned_month);

CREATE INDEX IF NOT EXISTS idx_prayer_assignments_cycle
  ON prayer_assignments(user_id, cycle_number);
