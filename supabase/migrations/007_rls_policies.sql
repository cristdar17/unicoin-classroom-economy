-- =============================================
-- RLS Policies for New Tables
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PURCHASE REQUESTS
-- =============================================
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can see all requests for their classrooms
CREATE POLICY "Teachers can view purchase requests for their classrooms"
ON purchase_requests FOR SELECT
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Teachers can update (approve/reject) requests for their classrooms
CREATE POLICY "Teachers can update purchase requests for their classrooms"
ON purchase_requests FOR UPDATE
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access to purchase_requests"
ON purchase_requests FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- 2. TRANSFER REQUESTS
-- =============================================
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can see all transfer requests for their classrooms
CREATE POLICY "Teachers can view transfer requests for their classrooms"
ON transfer_requests FOR SELECT
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Teachers can update (approve/reject) transfer requests
CREATE POLICY "Teachers can update transfer requests for their classrooms"
ON transfer_requests FOR UPDATE
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role full access to transfer_requests"
ON transfer_requests FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- 3. STUDENT STREAKS
-- =============================================
ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;

-- Teachers can view streaks for students in their classrooms
CREATE POLICY "Teachers can view student streaks in their classrooms"
ON student_streaks FOR SELECT
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role full access to student_streaks"
ON student_streaks FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- 4. STREAK REWARDS
-- =============================================
ALTER TABLE streak_rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can view streak rewards (they're configuration, not sensitive)
CREATE POLICY "Anyone can view streak rewards"
ON streak_rewards FOR SELECT
USING (true);

-- Teachers can manage streak rewards for their classrooms
CREATE POLICY "Teachers can insert streak rewards for their classrooms"
ON streak_rewards FOR INSERT
WITH CHECK (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update streak rewards for their classrooms"
ON streak_rewards FOR UPDATE
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete streak rewards for their classrooms"
ON streak_rewards FOR DELETE
USING (
  classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role full access to streak_rewards"
ON streak_rewards FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- 5. ECONOMIC INDICATORS (if exists)
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'economic_indicators') THEN
    ALTER TABLE economic_indicators ENABLE ROW LEVEL SECURITY;

    -- Anyone can view economic indicators
    EXECUTE 'CREATE POLICY "Anyone can view economic indicators" ON economic_indicators FOR SELECT USING (true)';

    -- Service role can do everything
    EXECUTE 'CREATE POLICY "Service role full access to economic_indicators" ON economic_indicators FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
  END IF;
END $$;

-- =============================================
-- DONE! RLS is now enabled on all tables
-- =============================================
