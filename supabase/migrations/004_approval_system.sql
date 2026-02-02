-- =============================================
-- Migration: Approval System for Purchases and Transfers
-- =============================================

-- Table for pending purchase requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES teachers(id)
);

-- Table for pending transfer requests
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  to_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES teachers(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_requests_classroom ON purchase_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_student ON purchase_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_classroom ON transfer_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from ON transfer_requests(from_wallet_id);

-- Add last_price_update column to classrooms for tracking
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ;

-- Add settings for approval requirements
-- settings JSON can include: { "require_purchase_approval": true, "require_transfer_approval": true }
