// ============================================
// Database Types - Match Supabase schema
// ============================================

export interface Teacher {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Classroom {
  id: string
  teacher_id: string
  name: string
  code: string // 6-char unique code to join
  currency_name: string // e.g., "UniCoins", "Estrellas"
  currency_symbol: string // e.g., "🪙", "⭐", "$"
  treasury_total: number // Total coins created for the semester
  treasury_remaining: number // Coins left to emit
  settings: ClassroomSettings
  created_at: string
}

export interface ClassroomSettings {
  allow_p2p_transfers: boolean
  max_transfer_amount: number | null
  show_leaderboard: boolean
  show_economic_indicators: boolean
  semester_end_date: string | null // When the economy ends
}

export interface Student {
  id: string
  name: string
  pin_hash: string // Hashed 4-digit PIN
  classroom_id: string
  photo_url: string | null // Student profile photo
  joined_at: string
}

export interface Wallet {
  id: string
  student_id: string
  classroom_id: string
  balance: number
  created_at: string
  updated_at: string
}

export type TransactionType = 'EMISSION' | 'TRANSFER' | 'PURCHASE' | 'REFUND' | 'COLLECTIVE_CONTRIBUTION' | 'SAVINGS_LOCK' | 'SAVINGS_WITHDRAW'

export interface Transaction {
  id: string
  classroom_id: string
  from_wallet_id: string | null // null for emissions
  to_wallet_id: string | null // null for purchases
  amount: number
  type: TransactionType
  reason: string
  approved_by: string | null // teacher_id if approved
  created_at: string
}

export type MarketItemType = 'INDIVIDUAL' | 'COLLECTIVE'

export interface MarketItem {
  id: string
  classroom_id: string
  name: string
  description: string
  base_price: number
  current_price: number
  stock: number | null // null = unlimited
  type: MarketItemType
  is_active: boolean
  created_at: string
}

export type CollectivePurchaseStatus = 'OPEN' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'

export interface CollectivePurchase {
  id: string
  market_item_id: string
  target_amount: number
  current_amount: number
  status: CollectivePurchaseStatus
  expires_at: string | null
  created_at: string
}

export interface CollectiveContribution {
  id: string
  collective_purchase_id: string
  wallet_id: string
  amount: number
  created_at: string
}

export interface EconomicSnapshot {
  id: string
  classroom_id: string
  total_supply: number
  velocity: number // transactions volume / average supply
  inflation_rate: number // % change in supply
  gini_index: number // wealth inequality (0-1)
  timestamp: string
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface JoinClassroomRequest {
  code: string
  name: string
  pin: string // 4 digits
}

export interface EmitCoinsRequest {
  student_id: string
  amount: number
  reason: string
}

export interface TransferRequest {
  to_student_id: string
  amount: number
  note?: string
}

export interface CreateClassroomRequest {
  name: string
  currency_name: string
  currency_symbol: string
}

export interface CreateMarketItemRequest {
  name: string
  description: string
  base_price: number
  stock?: number
  type: MarketItemType
}

// ============================================
// Frontend Types
// ============================================

export interface StudentSession {
  student_id: string
  classroom_id: string
  name: string
  exp: number // JWT expiration
}

export interface ClassroomWithStats extends Classroom {
  student_count: number
  total_supply: number
}

export interface StudentWithWallet extends Student {
  wallet: Wallet
}

export interface TransactionWithDetails extends Transaction {
  from_student_name?: string
  to_student_name?: string
}

export interface LeaderboardEntry {
  rank: number
  student_id: string
  student_name: string
  balance: number
}

export interface EconomicIndicators {
  total_supply: number
  average_balance: number
  median_balance: number
  inflation_rate: number
  velocity: number
  gini_index: number
  richest_student: string
  poorest_student: string
}

// ============================================
// Emission Reasons (predefined)
// ============================================

export const EMISSION_REASONS = [
  { id: 'participation', label: 'Participación en clase', icon: '🙋' },
  { id: 'attendance', label: 'Asistencia', icon: '✅' },
  { id: 'board', label: 'Salir al tablero', icon: '📝' },
  { id: 'first_delivery', label: 'Entregar primero', icon: '🏆' },
  { id: 'homework', label: 'Tarea completa', icon: '📚' },
  { id: 'quiz', label: 'Quiz/Examen', icon: '📋' },
  { id: 'teamwork', label: 'Trabajo en equipo', icon: '🤝' },
  { id: 'bonus', label: 'Bonus especial', icon: '⭐' },
  { id: 'custom', label: 'Otro (especificar)', icon: '✏️' },
] as const

export type EmissionReasonId = typeof EMISSION_REASONS[number]['id']

// ============================================
// Approval System Types
// ============================================

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface PurchaseRequest {
  id: string
  classroom_id: string
  student_id: string
  wallet_id: string
  item_id: string
  item_name: string
  price: number
  message: string | null
  status: RequestStatus
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface TransferRequest {
  id: string
  classroom_id: string
  from_wallet_id: string
  to_wallet_id: string
  amount: number
  message: string
  status: RequestStatus
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface PurchaseRequestWithDetails extends PurchaseRequest {
  student_name: string
}

export interface TransferRequestWithDetails extends TransferRequest {
  from_student_name: string
  to_student_name: string
}

// ============================================
// Streaks and Rewards Types
// ============================================

export type StreakType = 'ATTENDANCE' | 'PARTICIPATION' | 'BOARD' | 'HOMEWORK' | 'QUIZ'

export interface StudentStreak {
  id: string
  student_id: string
  classroom_id: string
  streak_type: StreakType
  current_streak: number
  best_streak: number
  last_activity_date: string | null
  total_count: number
  created_at: string
  updated_at: string
}

export interface StreakReward {
  id: string
  classroom_id: string
  streak_type: StreakType
  milestone: number
  reward_amount: number
  reward_name: string
  is_active: boolean
}

export const STREAK_TYPES = [
  { id: 'ATTENDANCE' as const, label: 'Asistencia', icon: '✅', description: 'Días consecutivos asistiendo a clase' },
  { id: 'PARTICIPATION' as const, label: 'Participación', icon: '🙋', description: 'Días consecutivos participando' },
  { id: 'BOARD' as const, label: 'Tablero', icon: '📝', description: 'Días consecutivos saliendo al tablero' },
  { id: 'HOMEWORK' as const, label: 'Tareas', icon: '📚', description: 'Tareas entregadas consecutivamente' },
  { id: 'QUIZ' as const, label: 'Quizes', icon: '📋', description: 'Quizes presentados consecutivamente' },
]

export const DEFAULT_STREAK_MILESTONES = [3, 5, 7, 10, 15, 20, 30]

// ============================================
// Economic Indicators Types
// ============================================

export interface EconomicIndicatorSnapshot {
  id: string
  classroom_id: string
  snapshot_date: string
  // Supply
  total_supply: number
  circulating_supply: number
  treasury_remaining: number
  // Velocity
  daily_transactions: number
  daily_volume: number
  velocity: number
  // Prices
  avg_item_price: number
  price_index: number
  inflation_rate: number
  // Distribution
  gini_index: number
  top_10_percent_wealth: number
  bottom_50_percent_wealth: number
  median_balance: number
  avg_balance: number
  // Market
  pending_purchases: number
  pending_transfers: number
  demand_index: number
  created_at: string
}

export interface EconomicEducation {
  indicator: string
  value: number | string
  explanation: string
  realWorldExample: string
  interpretation: string
  color: 'green' | 'yellow' | 'red' | 'blue'
}

// ============================================
// Savings System Types
// ============================================

export type SavingsStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface SavingsRate {
  id: string
  classroom_id: string
  lock_days: number
  interest_rate: string // Decimal as string, e.g., "5.00"
  min_amount: number
  max_amount: number | null
  is_active: boolean
  created_at: string
}

export interface SavingsAccount {
  id: string
  student_id: string
  wallet_id: string
  classroom_id: string
  amount: number
  interest_rate: number
  projected_interest: number
  final_amount: number | null
  lock_days: number
  start_date: string
  end_date: string
  status: SavingsStatus
  completed_at: string | null
  cancelled_at: string | null
  early_withdrawal_penalty: number
  created_at: string
}

export interface SavingsAccountWithInfo extends SavingsAccount {
  days_elapsed: number
  days_remaining: number
  progress: number
  is_mature: boolean
  can_withdraw: boolean
  early_withdrawal_amount: number
  current_value: number
  projected_total: number
}

export interface SavingsSummary {
  total_locked: number
  total_projected_interest: number
  total_earned_all_time: number
  active_count: number
}

// ============================================
// Badge/Achievement System Types
// ============================================

export type BadgeCategory = 'STREAK' | 'WEALTH' | 'TRADING' | 'SAVINGS' | 'SOCIAL' | 'SPECIAL'
export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type BadgeCriteriaType = 'STREAK' | 'BALANCE' | 'TRANSACTIONS' | 'SAVINGS' | 'CUSTOM'

export interface Badge {
  id: string
  classroom_id: string | null
  code: string
  name: string
  description: string
  icon: string
  category: BadgeCategory
  criteria_type: BadgeCriteriaType
  criteria_value: number | null
  criteria_streak_type: string | null
  rarity: BadgeRarity
  reward_amount: number
  is_active: boolean
  created_at: string
}

export interface StudentBadge {
  id: string
  student_id: string
  badge_id: string
  classroom_id: string
  unlocked_at: string
  level: number
  metadata: Record<string, any>
}

export interface StudentBadgeWithDetails extends StudentBadge {
  badge: Badge
}

// ============================================
// PIN Reset Types
// ============================================

export type PinResetStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED'

export interface PinResetRequest {
  id: string
  student_id: string
  classroom_id: string
  status: PinResetStatus
  temp_code: string | null
  temp_code_expires_at: string | null
  reason: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}
