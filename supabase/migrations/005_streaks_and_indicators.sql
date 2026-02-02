-- =============================================
-- Migration: Streaks, Rewards, and Enhanced Indicators
-- =============================================

-- Table for tracking student activity streaks
CREATE TABLE IF NOT EXISTS student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ')),
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, classroom_id, streak_type)
);

-- Table for streak rewards configuration per classroom
CREATE TABLE IF NOT EXISTS streak_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ')),
  milestone INTEGER NOT NULL, -- e.g., 3, 5, 7, 10, 15, 20
  reward_amount INTEGER NOT NULL,
  reward_name TEXT NOT NULL, -- e.g., "Racha de 5 días"
  is_active BOOLEAN DEFAULT true,
  UNIQUE(classroom_id, streak_type, milestone)
);

-- Table for economic snapshots (enhanced)
CREATE TABLE IF NOT EXISTS economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  -- Supply metrics
  total_supply INTEGER NOT NULL,
  circulating_supply INTEGER NOT NULL, -- total in wallets
  treasury_remaining INTEGER NOT NULL,
  -- Velocity metrics
  daily_transactions INTEGER DEFAULT 0,
  daily_volume INTEGER DEFAULT 0,
  velocity DECIMAL(10,4) DEFAULT 0,
  -- Price metrics
  avg_item_price DECIMAL(10,2),
  price_index DECIMAL(10,4) DEFAULT 100, -- base 100
  inflation_rate DECIMAL(10,4) DEFAULT 0,
  -- Distribution metrics
  gini_index DECIMAL(10,4) DEFAULT 0,
  top_10_percent_wealth DECIMAL(10,4) DEFAULT 0,
  bottom_50_percent_wealth DECIMAL(10,4) DEFAULT 0,
  median_balance INTEGER DEFAULT 0,
  avg_balance DECIMAL(10,2) DEFAULT 0,
  -- Market metrics
  pending_purchases INTEGER DEFAULT 0,
  pending_transfers INTEGER DEFAULT 0,
  demand_index DECIMAL(10,4) DEFAULT 100,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, snapshot_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_streaks_student ON student_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_streaks_classroom ON student_streaks(classroom_id);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_classroom ON economic_indicators(classroom_id);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_date ON economic_indicators(snapshot_date);

-- Add cancelled_at column to request tables
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Update status check to include CANCELLED
ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

ALTER TABLE transfer_requests DROP CONSTRAINT IF EXISTS transfer_requests_status_check;
ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
