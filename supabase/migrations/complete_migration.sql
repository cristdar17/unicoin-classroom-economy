-- =============================================
-- MIGRACIÓN COMPLETA - Ejecutar en Supabase SQL Editor
-- Ejecuta este script completo de una vez
-- =============================================

-- =============================================
-- PASO 1: Treasury (Bolsa de monedas)
-- =============================================
ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS treasury_total INTEGER NOT NULL DEFAULT 10000;

ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS treasury_remaining INTEGER NOT NULL DEFAULT 10000;

-- Constraints (ignorar errores si ya existen)
DO $$
BEGIN
  ALTER TABLE classrooms ADD CONSTRAINT treasury_remaining_non_negative CHECK (treasury_remaining >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE classrooms ADD CONSTRAINT treasury_remaining_max CHECK (treasury_remaining <= treasury_total);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- PASO 2: Sistema de Aprobación
-- =============================================

-- Tabla de solicitudes de compra
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES teachers(id)
);

-- Tabla de solicitudes de transferencia
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  to_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES teachers(id)
);

-- Índices para solicitudes
CREATE INDEX IF NOT EXISTS idx_purchase_requests_classroom ON purchase_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_student ON purchase_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_classroom ON transfer_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from ON transfer_requests(from_wallet_id);

-- Columna para tracking de actualización de precios
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ;

-- =============================================
-- PASO 3: Sistema de Rachas
-- =============================================

-- Tabla de rachas de estudiantes
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

-- Tabla de recompensas por rachas
CREATE TABLE IF NOT EXISTS streak_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ')),
  milestone INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(classroom_id, streak_type, milestone)
);

-- Índices para rachas
CREATE INDEX IF NOT EXISTS idx_student_streaks_student ON student_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_streaks_classroom ON student_streaks(classroom_id);

-- =============================================
-- PASO 4: Indicadores Económicos
-- =============================================

-- Tabla para snapshots de indicadores económicos
CREATE TABLE IF NOT EXISTS economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  -- Supply metrics
  total_supply INTEGER NOT NULL DEFAULT 0,
  circulating_supply INTEGER NOT NULL DEFAULT 0,
  treasury_remaining INTEGER NOT NULL DEFAULT 0,
  -- Velocity metrics
  daily_transactions INTEGER DEFAULT 0,
  daily_volume INTEGER DEFAULT 0,
  velocity DECIMAL(10,4) DEFAULT 0,
  -- Price metrics
  avg_item_price DECIMAL(10,2),
  price_index DECIMAL(10,4) DEFAULT 100,
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

-- Índices para indicadores
CREATE INDEX IF NOT EXISTS idx_economic_indicators_classroom ON economic_indicators(classroom_id);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_date ON economic_indicators(snapshot_date);

-- =============================================
-- PASO 5: Agregar columna price_updated_at a market_items
-- =============================================
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- =============================================
-- LISTO! Todas las tablas han sido creadas
-- =============================================
