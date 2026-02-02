-- =============================================
-- Sistema de Bolsas de Ahorro (Savings System)
-- Run this in Supabase SQL Editor
-- =============================================

-- Tabla de cuentas de ahorro
CREATE TABLE IF NOT EXISTS savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,

  -- Montos
  amount INTEGER NOT NULL CHECK (amount > 0),
  interest_rate DECIMAL(5,2) NOT NULL, -- Porcentaje (ej: 5.00 = 5%)
  projected_interest INTEGER NOT NULL, -- Interés proyectado
  final_amount INTEGER, -- Monto final al completar (amount + interest real)

  -- Tiempo
  lock_days INTEGER NOT NULL CHECK (lock_days > 0),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,

  -- Estado
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  early_withdrawal_penalty DECIMAL(5,2) DEFAULT 50.00, -- 50% penalización por retiro anticipado

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_savings_student ON savings_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_savings_wallet ON savings_accounts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_savings_classroom ON savings_accounts(classroom_id);
CREATE INDEX IF NOT EXISTS idx_savings_status ON savings_accounts(status);
CREATE INDEX IF NOT EXISTS idx_savings_end_date ON savings_accounts(end_date);

-- RLS
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;

-- Teachers can view savings in their classrooms
CREATE POLICY "Teachers view savings in their classrooms"
ON savings_accounts FOR SELECT
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

-- Service role full access
CREATE POLICY "Service role savings"
ON savings_accounts FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- Configuración de tasas de interés por aula
-- =============================================

CREATE TABLE IF NOT EXISTS savings_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lock_days INTEGER NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  min_amount INTEGER DEFAULT 10,
  max_amount INTEGER, -- NULL = sin límite
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, lock_days)
);

-- RLS para savings_rates
ALTER TABLE savings_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view savings_rates"
ON savings_rates FOR SELECT USING (true);

CREATE POLICY "Teachers manage savings_rates"
ON savings_rates FOR ALL
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Service role savings_rates"
ON savings_rates FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- Función para inicializar tasas por defecto
-- =============================================

CREATE OR REPLACE FUNCTION initialize_savings_rates(p_classroom_id UUID)
RETURNS void AS $$
BEGIN
  -- Insertar tasas por defecto si no existen
  INSERT INTO savings_rates (classroom_id, lock_days, interest_rate, min_amount)
  VALUES
    (p_classroom_id, 7, 2.00, 10),
    (p_classroom_id, 14, 5.00, 20),
    (p_classroom_id, 30, 10.00, 50),
    (p_classroom_id, 60, 18.00, 100),
    (p_classroom_id, 90, 25.00, 200)
  ON CONFLICT (classroom_id, lock_days) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
