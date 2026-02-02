import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const client = createServerSupabaseClient(event)

  // Get all savings for this student in this classroom
  const { data: savings, error } = await client
    .from('savings_accounts')
    .select('*')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching savings:', error)
    throw createError({ statusCode: 500, message: 'Error al obtener ahorros' })
  }

  const now = new Date()

  // Add computed fields
  const savingsWithInfo = (savings || []).map(s => {
    const endDate = new Date(s.end_date)
    const startDate = new Date(s.start_date)
    const totalDays = s.lock_days
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    const isMature = now >= endDate
    const canWithdraw = s.status === 'ACTIVE'

    // Calculate early withdrawal amount (50% penalty on interest, keep principal)
    const earlyWithdrawalAmount = s.amount // Just principal, no interest

    // Calculate current value if withdrawn now
    let currentValue = s.amount
    if (isMature && s.status === 'ACTIVE') {
      currentValue = s.amount + s.projected_interest
    }

    return {
      ...s,
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      progress,
      is_mature: isMature,
      can_withdraw: canWithdraw,
      early_withdrawal_amount: earlyWithdrawalAmount,
      current_value: currentValue,
      projected_total: s.amount + s.projected_interest,
    }
  })

  // Separate by status
  const active = savingsWithInfo.filter(s => s.status === 'ACTIVE')
  const completed = savingsWithInfo.filter(s => s.status === 'COMPLETED')
  const cancelled = savingsWithInfo.filter(s => s.status === 'CANCELLED')

  // Calculate totals
  const totalLocked = active.reduce((sum, s) => sum + s.amount, 0)
  const totalProjectedInterest = active.reduce((sum, s) => sum + s.projected_interest, 0)
  const totalEarned = completed.reduce((sum, s) => sum + (s.final_amount - s.amount), 0)

  return {
    data: {
      active,
      completed,
      cancelled,
      summary: {
        total_locked: totalLocked,
        total_projected_interest: totalProjectedInterest,
        total_earned_all_time: totalEarned,
        active_count: active.length,
      },
    },
  }
})
