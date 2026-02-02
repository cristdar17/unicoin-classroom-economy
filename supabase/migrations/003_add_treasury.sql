-- ============================================
-- Add Treasury (Limited Coin Pool) to Classrooms
-- Run this in Supabase SQL Editor
-- ============================================

-- Add treasury columns to classrooms
ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS treasury_total INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN IF NOT EXISTS treasury_remaining INTEGER NOT NULL DEFAULT 10000;

-- Add constraint to ensure treasury_remaining doesn't go negative
ALTER TABLE classrooms
ADD CONSTRAINT treasury_remaining_non_negative CHECK (treasury_remaining >= 0);

-- Add constraint to ensure treasury_remaining doesn't exceed total
ALTER TABLE classrooms
ADD CONSTRAINT treasury_remaining_max CHECK (treasury_remaining <= treasury_total);

-- Update settings default to include semester_end_date
ALTER TABLE classrooms
ALTER COLUMN settings SET DEFAULT '{
  "allow_p2p_transfers": true,
  "max_transfer_amount": null,
  "show_leaderboard": true,
  "show_economic_indicators": true,
  "semester_end_date": null
}'::jsonb;
