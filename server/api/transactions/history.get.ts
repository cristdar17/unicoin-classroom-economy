import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { classroom_id, wallet_id, limit = '50' } = query

  if (!classroom_id && !wallet_id) {
    throw createError({ statusCode: 400, message: 'classroom_id o wallet_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  let queryBuilder = client
    .from('transactions')
    .select(`
      id,
      classroom_id,
      from_wallet_id,
      to_wallet_id,
      amount,
      type,
      reason,
      created_at,
      from_wallet:wallets!transactions_from_wallet_id_fkey (
        students (
          name
        )
      ),
      to_wallet:wallets!transactions_to_wallet_id_fkey (
        students (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string))

  if (classroom_id) {
    queryBuilder = queryBuilder.eq('classroom_id', classroom_id)
  }

  if (wallet_id) {
    queryBuilder = queryBuilder.or(`from_wallet_id.eq.${wallet_id},to_wallet_id.eq.${wallet_id}`)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Error fetching transactions:', error)
    throw createError({ statusCode: 500, message: 'Error al cargar transacciones' })
  }

  // Format response
  const transactions = (data || []).map(tx => ({
    id: tx.id,
    classroom_id: tx.classroom_id,
    from_wallet_id: tx.from_wallet_id,
    to_wallet_id: tx.to_wallet_id,
    amount: tx.amount,
    type: tx.type,
    reason: tx.reason,
    created_at: tx.created_at,
    from_student_name: tx.from_wallet?.students?.name || null,
    to_student_name: tx.to_wallet?.students?.name || null,
  }))

  return { data: transactions }
})
