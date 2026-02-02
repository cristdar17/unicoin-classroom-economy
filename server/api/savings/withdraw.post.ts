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

  const body = await readBody(event)
  const { savings_id } = body

  if (!savings_id) {
    throw createError({ statusCode: 400, message: 'savings_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  // Get savings account
  const { data: savings } = await client
    .from('savings_accounts')
    .select('*')
    .eq('id', savings_id)
    .eq('student_id', session.student_id)
    .eq('status', 'ACTIVE')
    .single()

  if (!savings) {
    throw createError({ statusCode: 404, message: 'Bolsa de ahorro no encontrada o ya retirada' })
  }

  // Get wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('id', savings.wallet_id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrada' })
  }

  const now = new Date()
  const endDate = new Date(savings.end_date)
  const isMature = now >= endDate

  let finalAmount: number
  let transactionReason: string
  let status: 'COMPLETED' | 'CANCELLED'

  if (isMature) {
    // Mature withdrawal: get full amount + interest
    finalAmount = savings.amount + savings.projected_interest
    transactionReason = `Retiro de bolsa de ahorro (${savings.lock_days} días): ${savings.amount} + ${savings.projected_interest} interés`
    status = 'COMPLETED'
  } else {
    // Early withdrawal: only get principal (lose all interest)
    finalAmount = savings.amount
    transactionReason = `Retiro anticipado de bolsa: ${savings.amount} (interés perdido: ${savings.projected_interest})`
    status = 'CANCELLED'
  }

  // Update savings account
  const { error: updateError } = await client
    .from('savings_accounts')
    .update({
      status,
      final_amount: finalAmount,
      completed_at: status === 'COMPLETED' ? now.toISOString() : null,
      cancelled_at: status === 'CANCELLED' ? now.toISOString() : null,
    })
    .eq('id', savings_id)

  if (updateError) {
    console.error('Error updating savings:', updateError)
    throw createError({ statusCode: 500, message: 'Error al procesar retiro' })
  }

  // Add funds to wallet
  const { error: walletError } = await client
    .from('wallets')
    .update({ balance: wallet.balance + finalAmount })
    .eq('id', wallet.id)

  if (walletError) {
    // Rollback savings status
    await client
      .from('savings_accounts')
      .update({ status: 'ACTIVE', final_amount: null, completed_at: null, cancelled_at: null })
      .eq('id', savings_id)

    throw createError({ statusCode: 500, message: 'Error al actualizar wallet' })
  }

  // Record transaction
  await client.from('transactions').insert({
    from_wallet_id: null,
    to_wallet_id: wallet.id,
    amount: finalAmount,
    type: 'SAVINGS_WITHDRAW',
    reason: transactionReason,
    classroom_id: session.classroom_id,
  })

  const interestEarned = isMature ? savings.projected_interest : 0
  const interestLost = isMature ? 0 : savings.projected_interest

  return {
    data: {
      final_amount: finalAmount,
      interest_earned: interestEarned,
      interest_lost: interestLost,
      was_early: !isMature,
      message: isMature
        ? `¡Retiraste ${finalAmount} monedas (${savings.amount} + ${interestEarned} de interés)!`
        : `Retiraste ${finalAmount} monedas. Perdiste ${interestLost} monedas de interés por retiro anticipado.`,
    },
  }
})
