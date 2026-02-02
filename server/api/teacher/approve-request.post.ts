import { serverSupabaseUser } from '#supabase/server'
import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  // Verify teacher is authenticated
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { request_id, request_type, action, rejection_reason } = body

  if (!request_id || !request_type || !action) {
    throw createError({ statusCode: 400, message: 'Datos incompletos' })
  }

  if (!['APPROVE', 'REJECT'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Acción inválida' })
  }

  if (action === 'REJECT' && !rejection_reason) {
    throw createError({ statusCode: 400, message: 'Debe proporcionar una razón para el rechazo' })
  }

  const client = createServerSupabaseClient(event)

  if (request_type === 'PURCHASE') {
    return await handlePurchaseApproval(client, user.id, request_id, action, rejection_reason)
  } else if (request_type === 'TRANSFER') {
    return await handleTransferApproval(client, user.id, request_id, action, rejection_reason)
  } else {
    throw createError({ statusCode: 400, message: 'Tipo de solicitud inválido' })
  }
})

async function handlePurchaseApproval(
  client: any,
  teacherId: string,
  requestId: string,
  action: string,
  rejectionReason?: string
) {
  // Get purchase request
  const { data: request, error: requestError } = await client
    .from('purchase_requests')
    .select(`
      *,
      classrooms (
        teacher_id,
        currency_symbol
      )
    `)
    .eq('id', requestId)
    .eq('status', 'PENDING')
    .single()

  if (requestError || !request) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada' })
  }

  // Verify teacher owns classroom
  if (request.classrooms?.teacher_id !== teacherId) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta solicitud' })
  }

  if (action === 'REJECT') {
    // Update request status
    await client
      .from('purchase_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: teacherId,
      })
      .eq('id', requestId)

    return { data: { success: true, message: 'Solicitud rechazada' } }
  }

  // APPROVE: Check wallet balance and item stock
  const { data: wallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('id', request.wallet_id)
    .single()

  if (!wallet || wallet.balance < request.price) {
    // Reject due to insufficient balance
    await client
      .from('purchase_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: 'Balance insuficiente al momento de aprobar',
        reviewed_at: new Date().toISOString(),
        reviewed_by: teacherId,
      })
      .eq('id', requestId)

    throw createError({ statusCode: 400, message: 'El estudiante ya no tiene balance suficiente' })
  }

  // Check item stock
  const { data: item } = await client
    .from('market_items')
    .select('id, stock, name')
    .eq('id', request.item_id)
    .single()

  if (item?.stock !== null && item?.stock <= 0) {
    await client
      .from('purchase_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: 'Item agotado',
        reviewed_at: new Date().toISOString(),
        reviewed_by: teacherId,
      })
      .eq('id', requestId)

    throw createError({ statusCode: 400, message: 'El item ya no tiene stock' })
  }

  // Process purchase
  // 1. Create transaction
  const reason = request.message
    ? `Compra: ${request.item_name} | Nota: ${request.message}`
    : `Compra: ${request.item_name}`

  await client.from('transactions').insert({
    classroom_id: request.classroom_id,
    from_wallet_id: request.wallet_id,
    to_wallet_id: null,
    amount: request.price,
    type: 'PURCHASE',
    reason,
    approved_by: teacherId,
  })

  // 2. Update wallet balance
  await client
    .from('wallets')
    .update({
      balance: wallet.balance - request.price,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.wallet_id)

  // 3. Update item stock
  if (item?.stock !== null) {
    await client
      .from('market_items')
      .update({ stock: item.stock - 1 })
      .eq('id', request.item_id)
  }

  // 4. Update request status
  await client
    .from('purchase_requests')
    .update({
      status: 'APPROVED',
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    })
    .eq('id', requestId)

  return { data: { success: true, message: 'Compra aprobada y procesada' } }
}

async function handleTransferApproval(
  client: any,
  teacherId: string,
  requestId: string,
  action: string,
  rejectionReason?: string
) {
  // Get transfer request
  const { data: request, error: requestError } = await client
    .from('transfer_requests')
    .select(`
      *,
      classrooms (
        teacher_id
      )
    `)
    .eq('id', requestId)
    .eq('status', 'PENDING')
    .single()

  if (requestError || !request) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada' })
  }

  // Verify teacher owns classroom
  if (request.classrooms?.teacher_id !== teacherId) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta solicitud' })
  }

  if (action === 'REJECT') {
    await client
      .from('transfer_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: teacherId,
      })
      .eq('id', requestId)

    return { data: { success: true, message: 'Transferencia rechazada' } }
  }

  // APPROVE: Check sender balance
  const { data: senderWallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('id', request.from_wallet_id)
    .single()

  if (!senderWallet || senderWallet.balance < request.amount) {
    await client
      .from('transfer_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: 'Balance insuficiente al momento de aprobar',
        reviewed_at: new Date().toISOString(),
        reviewed_by: teacherId,
      })
      .eq('id', requestId)

    throw createError({ statusCode: 400, message: 'El remitente ya no tiene balance suficiente' })
  }

  // Get receiver wallet
  const { data: receiverWallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('id', request.to_wallet_id)
    .single()

  if (!receiverWallet) {
    throw createError({ statusCode: 404, message: 'Wallet del destinatario no encontrado' })
  }

  // Process transfer
  // 1. Create transaction
  await client.from('transactions').insert({
    classroom_id: request.classroom_id,
    from_wallet_id: request.from_wallet_id,
    to_wallet_id: request.to_wallet_id,
    amount: request.amount,
    type: 'TRANSFER',
    reason: `Transferencia: ${request.message}`,
    approved_by: teacherId,
  })

  // 2. Update sender balance
  await client
    .from('wallets')
    .update({
      balance: senderWallet.balance - request.amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.from_wallet_id)

  // 3. Update receiver balance
  await client
    .from('wallets')
    .update({
      balance: receiverWallet.balance + request.amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.to_wallet_id)

  // 4. Update request status
  await client
    .from('transfer_requests')
    .update({
      status: 'APPROVED',
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    })
    .eq('id', requestId)

  return { data: { success: true, message: 'Transferencia aprobada y procesada' } }
}
