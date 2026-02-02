import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  // Verify teacher is authenticated
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const query = getQuery(event)
  const { classroom_id } = query

  if (!classroom_id) {
    throw createError({ statusCode: 400, message: 'classroom_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  // Verify teacher owns classroom
  const { data: classroom } = await client
    .from('classrooms')
    .select('id')
    .eq('id', classroom_id)
    .eq('teacher_id', user.id)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta aula' })
  }

  // Get pending purchase requests
  const { data: purchaseRequests, error: purchaseError } = await client
    .from('purchase_requests')
    .select(`
      id,
      student_id,
      item_id,
      item_name,
      price,
      message,
      status,
      created_at,
      students (
        name
      )
    `)
    .eq('classroom_id', classroom_id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })

  if (purchaseError) {
    console.error('Error fetching purchase requests:', purchaseError)
  }

  // Get pending transfer requests
  const { data: transferRequests, error: transferError } = await client
    .from('transfer_requests')
    .select(`
      id,
      from_wallet_id,
      to_wallet_id,
      amount,
      message,
      status,
      created_at,
      from_wallet:wallets!transfer_requests_from_wallet_id_fkey (
        students (
          name
        )
      ),
      to_wallet:wallets!transfer_requests_to_wallet_id_fkey (
        students (
          name
        )
      )
    `)
    .eq('classroom_id', classroom_id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })

  if (transferError) {
    console.error('Error fetching transfer requests:', transferError)
  }

  // Format responses
  const purchases = (purchaseRequests || []).map(r => ({
    id: r.id,
    type: 'PURCHASE' as const,
    student_name: r.students?.name || 'Desconocido',
    item_name: r.item_name,
    amount: r.price,
    message: r.message,
    created_at: r.created_at,
  }))

  const transfers = (transferRequests || []).map(r => ({
    id: r.id,
    type: 'TRANSFER' as const,
    from_student_name: r.from_wallet?.students?.name || 'Desconocido',
    to_student_name: r.to_wallet?.students?.name || 'Desconocido',
    amount: r.amount,
    message: r.message,
    created_at: r.created_at,
  }))

  // Combine and sort by date
  const allRequests = [...purchases, ...transfers].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return {
    data: {
      requests: allRequests,
      purchase_count: purchases.length,
      transfer_count: transfers.length,
    },
  }
})
