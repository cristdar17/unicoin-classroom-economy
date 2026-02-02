import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import { updateStreak, REASON_TO_STREAK, type StreakType } from '~/server/utils/streaks'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { classroom_id, student_ids, amount, reason, reason_id } = body

  // Validate input
  if (!classroom_id || !student_ids?.length || !amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'Datos inválidos' })
  }

  // Use service role client for operations
  const client = createServerSupabaseClient(event)

  // Verify teacher owns classroom and get treasury info
  const { data: classroom, error: classroomError } = await client
    .from('classrooms')
    .select('id, treasury_remaining, currency_symbol')
    .eq('id', classroom_id)
    .eq('teacher_id', user.id)
    .single()

  if (classroomError || !classroom) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta aula' })
  }

  // Calculate total emission (will be adjusted for streak bonuses)
  let baseEmission = amount * student_ids.length

  // Check if treasury has enough coins (with buffer for potential streak bonuses)
  const maxStreakBonus = 200 * student_ids.length // Maximum possible streak bonus
  if (classroom.treasury_remaining < baseEmission) {
    throw createError({
      statusCode: 400,
      message: `No hay suficientes monedas en la bolsa. Disponibles: ${classroom.treasury_remaining} ${classroom.currency_symbol}, Necesarias: ${baseEmission} ${classroom.currency_symbol}`
    })
  }

  // Get wallets and student info
  const { data: wallets, error: walletsError } = await client
    .from('wallets')
    .select('id, student_id, balance')
    .eq('classroom_id', classroom_id)
    .in('student_id', student_ids)

  if (walletsError || !wallets?.length) {
    throw createError({ statusCode: 404, message: 'Estudiantes no encontrados' })
  }

  // Check if this reason triggers a streak
  const streakType: StreakType | undefined = reason_id ? REASON_TO_STREAK[reason_id] : undefined

  // Process each student
  const results = []
  let totalBonuses = 0
  let totalEmitted = 0

  for (const wallet of wallets) {
    let studentAmount = amount
    let streakResult = null
    const bonusTransactions = []

    // Update streak if applicable
    if (streakType) {
      streakResult = await updateStreak(client, wallet.student_id, classroom_id, streakType)

      if (streakResult && streakResult.total_bonus > 0) {
        // Check if treasury has enough for bonus
        const availableForBonus = classroom.treasury_remaining - baseEmission - totalBonuses
        const bonusToGive = Math.min(streakResult.total_bonus, availableForBonus)

        if (bonusToGive > 0) {
          totalBonuses += bonusToGive

          // Create bonus transactions for each milestone
          for (const milestone of streakResult.milestones_reached) {
            bonusTransactions.push({
              classroom_id,
              from_wallet_id: null,
              to_wallet_id: wallet.id,
              amount: milestone.reward_amount,
              type: 'EMISSION',
              reason: `🏆 ${milestone.reward_name} (${streakType})`,
              approved_by: user.id,
            })
          }
        }
      }
    }

    // Create main emission transaction
    const mainTransaction = {
      classroom_id,
      from_wallet_id: null,
      to_wallet_id: wallet.id,
      amount,
      type: 'EMISSION',
      reason: reason || 'Emisión de monedas',
      approved_by: user.id,
    }

    // Insert all transactions
    const allTransactions = [mainTransaction, ...bonusTransactions]
    await client.from('transactions').insert(allTransactions)

    // Calculate total for this student
    const totalForStudent = amount + (streakResult?.total_bonus || 0)
    totalEmitted += totalForStudent

    // Update wallet balance
    await client
      .from('wallets')
      .update({
        balance: wallet.balance + totalForStudent,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    results.push({
      student_id: wallet.student_id,
      base_amount: amount,
      streak_bonus: streakResult?.total_bonus || 0,
      total_received: totalForStudent,
      streak_info: streakResult ? {
        type: streakResult.streak_type,
        current: streakResult.current_streak,
        best: streakResult.best_streak,
        is_new_best: streakResult.is_new_best,
        milestones: streakResult.milestones_reached,
      } : null,
    })
  }

  // Update treasury
  await client
    .from('classrooms')
    .update({ treasury_remaining: classroom.treasury_remaining - totalEmitted })
    .eq('id', classroom_id)

  return {
    data: {
      emitted_to: wallets.length,
      amount_per_student: amount,
      total_base: baseEmission,
      total_bonuses: totalBonuses,
      total_emitted: totalEmitted,
      treasury_remaining: classroom.treasury_remaining - totalEmitted,
      student_results: results,
    },
  }
})
