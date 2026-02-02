// ============================================
// Dynamic Economy Engine
// Algoritmos de precios dinámicos y economía
// ============================================

export interface PricingFactors {
  basePrice: number
  demandScore: number      // 0-2 (purchases last 7 days vs average)
  scarcityScore: number    // 0-2 (based on stock)
  inflationRate: number    // Current inflation rate
  velocityFactor: number   // Money velocity impact
  timeFactor: number       // Time-based adjustments (end of semester = higher prices)
}

// Calculate dynamic price based on multiple factors
export function calculateDynamicPrice(factors: PricingFactors): number {
  const {
    basePrice,
    demandScore,
    scarcityScore,
    inflationRate,
    velocityFactor,
    timeFactor,
  } = factors

  // Base formula: price = base * demand * scarcity * (1 + inflation) * velocity * time
  let price = basePrice

  // Demand multiplier (0.8x to 1.5x)
  const demandMultiplier = 0.8 + (demandScore * 0.35)
  price *= demandMultiplier

  // Scarcity multiplier (1x to 2x)
  const scarcityMultiplier = 1 + (scarcityScore * 0.5)
  price *= scarcityMultiplier

  // Inflation adjustment
  price *= (1 + inflationRate)

  // Velocity adjustment (high velocity = slightly higher prices)
  const velocityMultiplier = 1 + (velocityFactor * 0.1)
  price *= velocityMultiplier

  // Time factor (end of semester = 1.2x, normal = 1x)
  price *= timeFactor

  // Round to nearest 5
  return Math.round(price / 5) * 5
}

// Calculate demand score (0-2) based on purchase history
export function calculateDemandScore(
  purchasesLast7Days: number,
  averagePurchasesPerWeek: number
): number {
  if (averagePurchasesPerWeek === 0) return 1 // Neutral
  const ratio = purchasesLast7Days / averagePurchasesPerWeek
  return Math.min(Math.max(ratio, 0), 2) // Clamp 0-2
}

// Calculate scarcity score (0-2) based on stock
export function calculateScarcityScore(
  currentStock: number | null,
  initialStock: number | null
): number {
  if (currentStock === null || initialStock === null) return 0 // Unlimited = no scarcity
  if (initialStock === 0) return 2 // Should not happen, but handle it

  const remainingRatio = currentStock / initialStock

  if (remainingRatio > 0.5) return 0      // Plenty of stock
  if (remainingRatio > 0.25) return 0.5   // Getting low
  if (remainingRatio > 0.1) return 1      // Low stock
  if (remainingRatio > 0) return 1.5      // Very low
  return 2                                  // Last items!
}

// Calculate inflation rate based on money supply changes
export function calculateInflationRate(
  currentSupply: number,
  previousSupply: number,
  periodDays: number = 7
): number {
  if (previousSupply === 0) return 0

  const changeRate = (currentSupply - previousSupply) / previousSupply
  // Annualize and then scale down for weekly
  const weeklyRate = changeRate / (periodDays / 7)

  // Cap inflation between -0.2 and 0.5
  return Math.min(Math.max(weeklyRate, -0.2), 0.5)
}

// Calculate money velocity
export function calculateVelocity(
  transactionVolume: number,
  averageSupply: number
): number {
  if (averageSupply === 0) return 0
  return transactionVolume / averageSupply
}

// Calculate Gini coefficient for wealth inequality
export function calculateGiniIndex(balances: number[]): number {
  if (balances.length === 0) return 0

  const sorted = [...balances].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)

  if (sum === 0) return 0

  let giniSum = 0
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i]
  }

  return Math.max(0, Math.min(1, giniSum / (n * sum)))
}

// Calculate time factor based on semester progress
export function calculateTimeFactor(
  semesterEndDate: string | null,
  currentDate: Date = new Date()
): number {
  if (!semesterEndDate) return 1

  const endDate = new Date(semesterEndDate)
  const now = currentDate.getTime()
  const end = endDate.getTime()

  // If past end date, max factor
  if (now >= end) return 1.3

  // Calculate days remaining
  const daysRemaining = (end - now) / (1000 * 60 * 60 * 24)

  // Last week = 1.3x, last 2 weeks = 1.2x, last month = 1.1x
  if (daysRemaining <= 7) return 1.3
  if (daysRemaining <= 14) return 1.2
  if (daysRemaining <= 30) return 1.1

  return 1
}

// Predefined market item templates
export const MARKET_ITEM_TEMPLATES = [
  // Academic benefits
  {
    category: 'academic',
    name: '+0.1 en parcial',
    description: 'Suma 0.1 a tu nota del próximo parcial',
    basePrice: 150,
    icon: '📝',
    suggestedStock: 20,
  },
  {
    category: 'academic',
    name: '+0.2 en parcial',
    description: 'Suma 0.2 a tu nota del próximo parcial',
    basePrice: 280,
    icon: '📝',
    suggestedStock: 15,
  },
  {
    category: 'academic',
    name: '+0.3 en parcial',
    description: 'Suma 0.3 a tu nota del próximo parcial',
    basePrice: 400,
    icon: '📝',
    suggestedStock: 10,
  },
  {
    category: 'academic',
    name: '+0.5 en parcial',
    description: 'Suma 0.5 a tu nota del próximo parcial (máximo beneficio)',
    basePrice: 600,
    icon: '🏆',
    suggestedStock: 5,
  },
  {
    category: 'academic',
    name: '+0.1 en taller',
    description: 'Suma 0.1 a tu nota del próximo taller',
    basePrice: 80,
    icon: '📋',
    suggestedStock: 30,
  },
  {
    category: 'academic',
    name: '+0.2 en taller',
    description: 'Suma 0.2 a tu nota del próximo taller',
    basePrice: 150,
    icon: '📋',
    suggestedStock: 20,
  },

  // Time extensions
  {
    category: 'time',
    name: 'Extensión 24h',
    description: 'Extiende el plazo de entrega de un taller por 24 horas',
    basePrice: 120,
    icon: '⏰',
    suggestedStock: 15,
  },
  {
    category: 'time',
    name: 'Extensión 48h',
    description: 'Extiende el plazo de entrega de un taller por 48 horas',
    basePrice: 200,
    icon: '⏰',
    suggestedStock: 10,
  },
  {
    category: 'time',
    name: 'Habilitación de entrega',
    description: 'Permite subir un taller después de cerrada la fecha',
    basePrice: 350,
    icon: '🔓',
    suggestedStock: 8,
  },

  // Class privileges
  {
    category: 'privilege',
    name: 'Salida 10 min antes',
    description: 'Sal 10 minutos antes de que termine la clase',
    basePrice: 100,
    icon: '🚪',
    suggestedStock: null, // Unlimited
  },
  {
    category: 'privilege',
    name: 'Salida 30 min antes (Colectivo)',
    description: 'Toda la clase sale 30 minutos antes. Requiere contribución grupal.',
    basePrice: 800,
    icon: '🎉',
    suggestedStock: 3,
    type: 'COLLECTIVE' as const,
  },
  {
    category: 'privilege',
    name: 'Clase libre (Colectivo)',
    description: 'Cancela una clase. Requiere contribución de toda la clase.',
    basePrice: 2000,
    icon: '🏖️',
    suggestedStock: 1,
    type: 'COLLECTIVE' as const,
  },
  {
    category: 'privilege',
    name: 'Elegir puesto',
    description: 'Elige tu puesto en el salón por una semana',
    basePrice: 50,
    icon: '💺',
    suggestedStock: null,
  },

  // Exam help
  {
    category: 'exam',
    name: 'Pista en quiz',
    description: 'El profesor te da una pista sobre una pregunta del quiz',
    basePrice: 80,
    icon: '💡',
    suggestedStock: 10,
  },
  {
    category: 'exam',
    name: 'Pregunta eliminada',
    description: 'Elimina la pregunta con peor nota de un quiz',
    basePrice: 200,
    icon: '❌',
    suggestedStock: 5,
  },
  {
    category: 'exam',
    name: 'Repetir quiz',
    description: 'Repite un quiz para mejorar tu nota',
    basePrice: 500,
    icon: '🔄',
    suggestedStock: 3,
  },

  // Fun items
  {
    category: 'fun',
    name: 'Snack en clase',
    description: 'Permiso para comer un snack durante la clase',
    basePrice: 30,
    icon: '🍪',
    suggestedStock: null,
  },
  {
    category: 'fun',
    name: 'Música en trabajo',
    description: 'Escucha música con audífonos durante trabajo en clase',
    basePrice: 40,
    icon: '🎵',
    suggestedStock: null,
  },
  {
    category: 'fun',
    name: 'Día sin llamado a lista',
    description: 'No te llaman a lista por un día (solo si asistes)',
    basePrice: 60,
    icon: '👻',
    suggestedStock: 10,
  },
]

export const ITEM_CATEGORIES = [
  { id: 'academic', name: 'Académico', icon: '📚', color: 'emerald' },
  { id: 'time', name: 'Tiempo', icon: '⏰', color: 'blue' },
  { id: 'privilege', name: 'Privilegios', icon: '⭐', color: 'amber' },
  { id: 'exam', name: 'Exámenes', icon: '📝', color: 'purple' },
  { id: 'fun', name: 'Diversión', icon: '🎉', color: 'pink' },
]

// Price trend indicator
export type PriceTrend = 'up' | 'down' | 'stable'

export function getPriceTrend(currentPrice: number, previousPrice: number): PriceTrend {
  const change = ((currentPrice - previousPrice) / previousPrice) * 100
  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

// Format price change percentage
export function formatPriceChange(currentPrice: number, previousPrice: number): string {
  if (previousPrice === 0) return '+0%'
  const change = ((currentPrice - previousPrice) / previousPrice) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}
