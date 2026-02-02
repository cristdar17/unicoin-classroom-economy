-- ============================================
-- UniCoin Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Teachers (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code CHAR(6) NOT NULL UNIQUE,
  currency_name TEXT NOT NULL DEFAULT 'Monedas',
  currency_symbol TEXT NOT NULL DEFAULT '🪙',
  settings JSONB NOT NULL DEFAULT '{
    "allow_p2p_transfers": true,
    "max_transfer_amount": null,
    "show_leaderboard": true,
    "show_economic_indicators": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, name)
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (immutable ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  from_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('EMISSION', 'TRANSFER', 'PURCHASE', 'REFUND', 'COLLECTIVE_CONTRIBUTION')),
  reason TEXT,
  approved_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Items
CREATE TABLE IF NOT EXISTS market_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL CHECK (base_price > 0),
  current_price INTEGER NOT NULL CHECK (current_price > 0),
  stock INTEGER CHECK (stock IS NULL OR stock >= 0),
  type TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (type IN ('INDIVIDUAL', 'COLLECTIVE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collective Purchases
CREATE TABLE IF NOT EXISTS collective_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collective Contributions
CREATE TABLE IF NOT EXISTS collective_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collective_purchase_id UUID NOT NULL REFERENCES collective_purchases(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Economic Snapshots (for metrics/analytics)
CREATE TABLE IF NOT EXISTS economic_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  total_supply INTEGER NOT NULL,
  velocity DECIMAL(10,4),
  inflation_rate DECIMAL(10,4),
  gini_index DECIMAL(5,4),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_code ON classrooms(code);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_wallets_student ON wallets(student_id);
CREATE INDEX IF NOT EXISTS idx_wallets_classroom ON wallets(classroom_id);
CREATE INDEX IF NOT EXISTS idx_transactions_classroom ON transactions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions(from_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions(to_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_items_classroom ON market_items(classroom_id);
CREATE INDEX IF NOT EXISTS idx_economic_snapshots_classroom ON economic_snapshots(classroom_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_snapshots ENABLE ROW LEVEL SECURITY;

-- Teachers: can only see their own record
CREATE POLICY "Teachers can view own record" ON teachers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can insert own record" ON teachers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Classrooms: teachers can manage their own, students can view their enrolled
CREATE POLICY "Teachers can view own classrooms" ON classrooms
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create classrooms" ON classrooms
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classrooms" ON classrooms
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view classroom by code" ON classrooms
  FOR SELECT USING (true);

-- Students: public read for classroom members
CREATE POLICY "Anyone can view students" ON students
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert students" ON students
  FOR INSERT WITH CHECK (true);

-- Wallets: public read for classroom members
CREATE POLICY "Anyone can view wallets" ON wallets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert wallets" ON wallets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update wallets" ON wallets
  FOR UPDATE USING (true);

-- Transactions: public read for audit
CREATE POLICY "Anyone can view transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- Market items: public read
CREATE POLICY "Anyone can view market items" ON market_items
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage market items" ON market_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = market_items.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- Collective purchases: public read
CREATE POLICY "Anyone can view collective purchases" ON collective_purchases
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert collective purchases" ON collective_purchases
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update collective purchases" ON collective_purchases
  FOR UPDATE USING (true);

-- Collective contributions: public read
CREATE POLICY "Anyone can view contributions" ON collective_contributions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert contributions" ON collective_contributions
  FOR INSERT WITH CHECK (true);

-- Economic snapshots: teachers can view their classrooms
CREATE POLICY "Teachers can view own snapshots" ON economic_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = economic_snapshots.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert snapshots" ON economic_snapshots
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for wallet updates
DROP TRIGGER IF EXISTS wallet_updated ON wallets;
CREATE TRIGGER wallet_updated
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- ============================================
-- SAMPLE DATA (optional, for testing)
-- ============================================

-- You can add sample data here if needed for testing
-- Example:
-- INSERT INTO teachers (id, email, name) VALUES ('...', 'test@example.com', 'Test Teacher');
