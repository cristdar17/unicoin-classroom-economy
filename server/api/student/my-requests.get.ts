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

  // Get student's wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrado' })
  }

  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString()

  // Get pending/rejected purchase requests
  const { data: purchases } = await client
    .from('purchase_requests')
    .select('id, item_name, price, message, status, created_at, rejection_reason, reviewed_at')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .in('status', ['PENDING', 'REJECTED'])
    .order('created_at', { ascending: false })
    .limit(20)

  // Get pending/rejected transfer requests
  const { data: transfers } = await client
    .from('transfer_requests')
    .select(`
      id,
      amount,
      message,
      status,
      created_at,
      rejection_reason,
      reviewed_at,
      to_wallet:wallets!transfer_requests_to_wallet_id_fkey (
        students (
          name
        )
      )
    `)
    .eq('from_wallet_id', wallet.id)
    .in('status', ['PENDING', 'REJECTED'])
    .order('created_at', { ascending: false })
    .limit(20)

  // Get recently resolved requests (approved/rejected in last minute)
  const { data: recentlyResolvedPurchases } = await client
    .from('purchase_requests')
    .select('id, item_name, price, status, rejection_reason, reviewed_at')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .in('status', ['APPROVED', 'REJECTED'])
    .gte('reviewed_at', oneMinuteAgo)
    .order('reviewed_at', { ascending: false })

  const { data: recentlyResolvedTransfers } = await client
    .from('transfer_requests')
    .select('id, amount, status, rejection_reason, reviewed_at')
    .eq('from_wallet_id', wallet.id)
    .in('status', ['APPROVED', 'REJECTED'])
    .gte('reviewed_at', oneMinuteAgo)
    .order('reviewed_at', { ascending: false })

  // Format requests
  const purchaseRequests = (purchases || []).map(p => {
    const createdAt = new Date(p.created_at)
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return {
      id: p.id,
      type: 'PURCHASE' as const,
      description: p.item_name,
      amount: p.price,
      message: p.message,
      status: p.status,
      rejection_reason: p.rejection_reason,
      created_at: p.created_at,
      can_cancel: p.status === 'PENDING' && hoursDiff <= 1,
      minutes_left: p.status === 'PENDING' ? Math.max(0, Math.floor(60 - hoursDiff * 60)) : 0,
    }
  })

  const transferRequests = (transfers || []).map(t => {
    const createdAt = new Date(t.created_at)
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return {
      id: t.id,
      type: 'TRANSFER' as const,
      description: `Transferencia a ${t.to_wallet?.students?.name || 'Desconocido'}`,
      amount: t.amount,
      message: t.message,
      status: t.status,
      rejection_reason: t.rejection_reason,
      created_at: t.created_at,
      can_cancel: t.status === 'PENDING' && hoursDiff <= 1,
      minutes_left: t.status === 'PENDING' ? Math.max(0, Math.floor(60 - hoursDiff * 60)) : 0,
    }
  })

  // Format recently resolved for notifications
  const recentlyResolved = [
    ...(recentlyResolvedPurchases || []).map(p => ({
      id: p.id,
      type: 'purchase' as const,
      item_name: p.item_name,
      price: p.price,
      status: p.status,
      rejection_reason: p.rejection_reason,
      reviewed_at: p.reviewed_at,
    })),
    ...(recentlyResolvedTransfers || []).map(t => ({
      id: t.id,
      type: 'transfer' as const,
      amount: t.amount,
      status: t.status,
      rejection_reason: t.rejection_reason,
      reviewed_at: t.reviewed_at,
    })),
  ].sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime())

  // Combine and sort pending/rejected requests
  const allRequests = [...purchaseRequests, ...transferRequests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    data: {
      requests: allRequests,
      pending_count: allRequests.filter(r => r.status === 'PENDING').length,
      recently_resolved: recentlyResolved,
    },
  }
})
