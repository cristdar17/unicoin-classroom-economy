import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Verify student token
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
  const { amount, lock_days } = body

  if (!amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'Cantidad inválida' })
  }

  if (!lock_days || lock_days <= 0) {
    throw createError({ statusCode: 400, message: 'Días de bloqueo inválidos' })
  }

  const client = createServerSupabaseClient(event)

  // Get wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrada' })
  }

  // Check balance
  if (wallet.balance < amount) {
    throw createError({ statusCode: 400, message: 'Saldo insuficiente' })
  }

  // Get interest rate for this lock period
  const { data: rate } = await client
    .from('savings_rates')
    .select('*')
    .eq('classroom_id', session.classroom_id)
    .eq('lock_days', lock_days)
    .eq('is_active', true)
    .single()

  if (!rate) {
    throw createError({ statusCode: 400, message: 'Plazo de ahorro no disponible' })
  }

  // Validate min/max amount
  if (amount < rate.min_amount) {
    throw createError({
      statusCode: 400,
      message: `Monto mínimo: ${rate.min_amount} monedas`,
    })
  }

  if (rate.max_amount && amount > rate.max_amount) {
    throw createError({
      statusCode: 400,
      message: `Monto máximo: ${rate.max_amount} monedas`,
    })
  }

  // Check if student already has an active savings of this type
  const { data: existingSavings } = await client
    .from('savings_accounts')
    .select('id')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .eq('lock_days', lock_days)
    .eq('status', 'ACTIVE')
    .single()

  if (existingSavings) {
    throw createError({
      statusCode: 400,
      message: 'Ya tienes una bolsa activa de este plazo. Espera a que termine o cancélala.',
    })
  }

  // Calculate interest with CDT-style bonus for larger amounts
  let baseRate = parseFloat(rate.interest_rate)
  let bonusRate = 0
  let hasBonus = false

  // Apply bonus rate if amount exceeds threshold
  if (rate.bonus_rate_threshold && rate.bonus_rate && amount >= rate.bonus_rate_threshold) {
    bonusRate = parseFloat(rate.bonus_rate)
    hasBonus = true
  }

  const totalRate = baseRate + bonusRate
  const projectedInterest = Math.floor(amount * (totalRate / 100))
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + lock_days)

  // Start transaction: deduct from wallet and create savings
  const { error: deductError } = await client
    .from('wallets')
    .update({ balance: wallet.balance - amount })
    .eq('id', wallet.id)
    .eq('balance', wallet.balance) // Optimistic locking

  if (deductError) {
    throw createError({ statusCode: 500, message: 'Error al procesar. Intenta de nuevo.' })
  }

  // Create savings account
  const { data: savings, error: savingsError } = await client
    .from('savings_accounts')
    .insert({
      student_id: session.student_id,
      wallet_id: wallet.id,
      classroom_id: session.classroom_id,
      amount,
      interest_rate: totalRate,
      projected_interest: projectedInterest,
      lock_days,
      end_date: endDate.toISOString(),
    })
    .select()
    .single()

  if (savingsError) {
    // Rollback wallet deduction
    await client
      .from('wallets')
      .update({ balance: wallet.balance })
      .eq('id', wallet.id)

    console.error('Error creating savings:', savingsError)
    throw createError({ statusCode: 500, message: 'Error al crear bolsa de ahorro' })
  }

  // Record transaction
  const rateDescription = hasBonus
    ? `${baseRate}% + ${bonusRate}% bonus = ${totalRate}%`
    : `${totalRate}%`

  await client.from('transactions').insert({
    from_wallet_id: wallet.id,
    to_wallet_id: null,
    amount,
    type: 'SAVINGS_LOCK',
    reason: `CDT: ${lock_days} días al ${rateDescription}`,
    classroom_id: session.classroom_id,
  })

  const bonusMessage = hasBonus
    ? ` (incluye +${bonusRate}% bonus por monto alto)`
    : ''

  return {
    data: {
      savings,
      has_bonus: hasBonus,
      base_rate: baseRate,
      bonus_rate: bonusRate,
      total_rate: totalRate,
      message: `¡CDT creado! Recibirás ${amount + projectedInterest} monedas en ${lock_days} días al ${totalRate}%${bonusMessage}.`,
    },
  }
})
