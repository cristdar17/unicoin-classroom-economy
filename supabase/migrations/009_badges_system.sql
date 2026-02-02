-- =============================================
-- Sistema de Insignias/Logros (Badges/Achievements)
-- Run this in Supabase SQL Editor
-- =============================================

-- Definición de insignias disponibles
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  -- NULL classroom_id = insignia global para todas las aulas

  code TEXT NOT NULL, -- Código único para la insignia (ej: 'streak_attendance_7')
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji o URL de icono
  category TEXT NOT NULL CHECK (category IN ('STREAK', 'WEALTH', 'TRADING', 'SAVINGS', 'SOCIAL', 'SPECIAL')),

  -- Criterios para desbloquear
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('STREAK', 'BALANCE', 'TRANSACTIONS', 'SAVINGS', 'CUSTOM')),
  criteria_value INTEGER, -- Valor numérico para comparar (ej: 7 días de racha)
  criteria_streak_type TEXT, -- Para rachas: ATTENDANCE, PARTICIPATION, etc.

  -- Rarezas
  rarity TEXT NOT NULL DEFAULT 'COMMON' CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),

  -- Recompensa al desbloquear
  reward_amount INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(classroom_id, code)
);

-- Insignias desbloqueadas por estudiantes
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  -- Para insignias que pueden tener progreso (ej: nivel 1, 2, 3)
  level INTEGER DEFAULT 1,
  -- Datos extra (JSON para flexibilidad)
  metadata JSONB DEFAULT '{}',

  UNIQUE(student_id, badge_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_badges_classroom ON badges(classroom_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_code ON badges(code);
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_classroom ON student_badges(classroom_id);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para badges
CREATE POLICY "Anyone can view badges"
ON badges FOR SELECT USING (true);

CREATE POLICY "Teachers manage badges in their classrooms"
ON badges FOR ALL
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Service role badges"
ON badges FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para student_badges
CREATE POLICY "Teachers view student badges in their classrooms"
ON student_badges FOR SELECT
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Service role student_badges"
ON student_badges FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- Función para inicializar insignias por defecto
-- =============================================

CREATE OR REPLACE FUNCTION initialize_default_badges(p_classroom_id UUID)
RETURNS void AS $$
BEGIN
  -- Insignias de Rachas de Asistencia
  INSERT INTO badges (classroom_id, code, name, description, icon, category, criteria_type, criteria_value, criteria_streak_type, rarity, reward_amount)
  VALUES
    (p_classroom_id, 'streak_attendance_3', 'Puntual', '3 días seguidos asistiendo', '⏰', 'STREAK', 'STREAK', 3, 'ATTENDANCE', 'COMMON', 5),
    (p_classroom_id, 'streak_attendance_7', 'Constante', '7 días seguidos asistiendo', '📅', 'STREAK', 'STREAK', 7, 'ATTENDANCE', 'COMMON', 15),
    (p_classroom_id, 'streak_attendance_14', 'Dedicado', '14 días seguidos asistiendo', '🎯', 'STREAK', 'STREAK', 14, 'ATTENDANCE', 'RARE', 30),
    (p_classroom_id, 'streak_attendance_30', 'Impecable', '30 días seguidos asistiendo', '👑', 'STREAK', 'STREAK', 30, 'ATTENDANCE', 'EPIC', 100),

    -- Insignias de Rachas de Participación
    (p_classroom_id, 'streak_participation_3', 'Participativo', '3 días seguidos participando', '🙋', 'STREAK', 'STREAK', 3, 'PARTICIPATION', 'COMMON', 5),
    (p_classroom_id, 'streak_participation_7', 'Voz Activa', '7 días seguidos participando', '📢', 'STREAK', 'STREAK', 7, 'PARTICIPATION', 'COMMON', 15),
    (p_classroom_id, 'streak_participation_14', 'Líder de Opinión', '14 días seguidos participando', '🌟', 'STREAK', 'STREAK', 14, 'PARTICIPATION', 'RARE', 30),
    (p_classroom_id, 'streak_participation_30', 'Leyenda Participativa', '30 días seguidos participando', '🏆', 'STREAK', 'STREAK', 30, 'PARTICIPATION', 'LEGENDARY', 150),

    -- Insignias de Rachas de Tablero
    (p_classroom_id, 'streak_board_3', 'Sin Miedo', '3 días seguidos al tablero', '✏️', 'STREAK', 'STREAK', 3, 'BOARD', 'COMMON', 10),
    (p_classroom_id, 'streak_board_5', 'Valiente', '5 días seguidos al tablero', '💪', 'STREAK', 'STREAK', 5, 'BOARD', 'RARE', 25),
    (p_classroom_id, 'streak_board_10', 'Maestro del Tablero', '10 días seguidos al tablero', '🎓', 'STREAK', 'STREAK', 10, 'BOARD', 'EPIC', 50),

    -- Insignias de Riqueza
    (p_classroom_id, 'wealth_100', 'Primer Ahorro', 'Alcanzar 100 monedas', '💰', 'WEALTH', 'BALANCE', 100, NULL, 'COMMON', 0),
    (p_classroom_id, 'wealth_500', 'Acumulador', 'Alcanzar 500 monedas', '💎', 'WEALTH', 'BALANCE', 500, NULL, 'RARE', 0),
    (p_classroom_id, 'wealth_1000', 'Rico', 'Alcanzar 1000 monedas', '🤑', 'WEALTH', 'BALANCE', 1000, NULL, 'EPIC', 0),
    (p_classroom_id, 'wealth_5000', 'Magnate', 'Alcanzar 5000 monedas', '👑', 'WEALTH', 'BALANCE', 5000, NULL, 'LEGENDARY', 0),

    -- Insignias de Trading
    (p_classroom_id, 'trading_first', 'Primera Transferencia', 'Realizar tu primera transferencia', '🤝', 'TRADING', 'TRANSACTIONS', 1, NULL, 'COMMON', 5),
    (p_classroom_id, 'trading_10', 'Comerciante', 'Realizar 10 transferencias', '📊', 'TRADING', 'TRANSACTIONS', 10, NULL, 'RARE', 20),
    (p_classroom_id, 'trading_50', 'Trader Experto', 'Realizar 50 transferencias', '📈', 'TRADING', 'TRANSACTIONS', 50, NULL, 'EPIC', 50),

    -- Insignias de Ahorro
    (p_classroom_id, 'savings_first', 'Primer Depósito', 'Crear tu primera bolsa de ahorro', '🏦', 'SAVINGS', 'SAVINGS', 1, NULL, 'COMMON', 10),
    (p_classroom_id, 'savings_complete', 'Paciente', 'Completar una bolsa de ahorro sin retiro anticipado', '⏳', 'SAVINGS', 'CUSTOM', 1, NULL, 'RARE', 25),
    (p_classroom_id, 'savings_3', 'Ahorrador Frecuente', 'Completar 3 bolsas de ahorro', '🐷', 'SAVINGS', 'SAVINGS', 3, NULL, 'EPIC', 50),

    -- Insignias Especiales
    (p_classroom_id, 'special_first_purchase', 'Primera Compra', 'Realizar tu primera compra en el mercado', '🛒', 'SPECIAL', 'CUSTOM', 1, NULL, 'COMMON', 5),
    (p_classroom_id, 'special_top_3', 'Top 3', 'Estar en el top 3 del ranking', '🥇', 'SPECIAL', 'CUSTOM', 1, NULL, 'EPIC', 0),
    (p_classroom_id, 'special_collector', 'Coleccionista', 'Desbloquear 10 insignias', '🎖️', 'SPECIAL', 'CUSTOM', 10, NULL, 'LEGENDARY', 100)
  ON CONFLICT (classroom_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Tabla para recuperación de PIN de estudiantes
-- =============================================

CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,

  -- El docente debe aprobar el reset
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'USED')),

  -- Código temporal de 6 dígitos generado por el sistema
  temp_code TEXT,
  temp_code_expires_at TIMESTAMPTZ,

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  reason TEXT -- Razón del estudiante para solicitar reset
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pin_reset_student ON pin_reset_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_classroom ON pin_reset_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_status ON pin_reset_requests(status);

-- RLS
ALTER TABLE pin_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view pin resets in their classrooms"
ON pin_reset_requests FOR SELECT
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Teachers manage pin resets"
ON pin_reset_requests FOR ALL
USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Service role pin_reset"
ON pin_reset_requests FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
