import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // This endpoint should be called by a cron job (e.g., Vercel Cron)
  // It processes all mature savings accounts automatically

  const client = serverSupabaseServiceRole(event)
  const now = new Date().toISOString()

  // Find all active savings that have matured
  const { data: matureSavings, error: fetchError } = await client
    .from('savings_accounts')
    .select('*, wallets!inner(id, balance)')
    .eq('status', 'ACTIVE')
    .lte('end_date', now)

  if (fetchError) {
    console.error('Error fetching mature savings:', fetchError)
    throw createError({ statusCode: 500, message: 'Error fetching savings' })
  }

  if (!matureSavings || matureSavings.length === 0) {
    return { processed: 0, message: 'No mature savings to process' }
  }

  let processed = 0
  const errors: string[] = []

  for (const savings of matureSavings) {
    try {
      const finalAmount = savings.amount + savings.projected_interest
      const wallet = savings.wallets

      // Update savings account to completed
      const { error: updateSavingsError } = await client
        .from('savings_accounts')
        .update({
          status: 'COMPLETED',
          final_amount: finalAmount,
          completed_at: now,
        })
        .eq('id', savings.id)

      if (updateSavingsError) {
        errors.push(`Savings ${savings.id}: ${updateSavingsError.message}`)
        continue
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
          .update({ status: 'ACTIVE', final_amount: null, completed_at: null })
          .eq('id', savings.id)

        errors.push(`Savings ${savings.id} wallet update: ${walletError.message}`)
        continue
      }

      // Record transaction
      await client.from('transactions').insert({
        from_wallet_id: null,
        to_wallet_id: wallet.id,
        amount: finalAmount,
        type: 'SAVINGS_WITHDRAW',
        reason: `Auto-completado bolsa de ahorro (${savings.lock_days} días): ${savings.amount} + ${savings.projected_interest} interés`,
        classroom_id: savings.classroom_id,
      })

      processed++
    } catch (err) {
      errors.push(`Savings ${savings.id}: ${String(err)}`)
    }
  }

  return {
    processed,
    total: matureSavings.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Processed ${processed}/${matureSavings.length} mature savings`,
  }
})
