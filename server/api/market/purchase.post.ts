import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Get student from token
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
  const { item_id, message } = body

  if (!item_id) {
    throw createError({ statusCode: 400, message: 'item_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  // Get item
  const { data: item, error: itemError } = await client
    .from('market_items')
    .select('*')
    .eq('id', item_id)
    .eq('classroom_id', session.classroom_id)
    .eq('is_active', true)
    .single()

  if (itemError || !item) {
    throw createError({ statusCode: 404, message: 'Item no encontrado' })
  }

  if (item.type !== 'INDIVIDUAL') {
    throw createError({ statusCode: 400, message: 'Este item requiere compra colectiva' })
  }

  if (item.stock !== null && item.stock <= 0) {
    throw createError({ statusCode: 400, message: 'Item agotado' })
  }

  // Get wallet
  const { data: wallet, error: walletError } = await client
    .from('wallets')
    .select('id, balance')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (walletError || !wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrado' })
  }

  if (wallet.balance < item.current_price) {
    throw createError({ statusCode: 400, message: 'Balance insuficiente' })
  }

  // Check if student already has a pending request for this item
  const { data: existingRequest } = await client
    .from('purchase_requests')
    .select('id')
    .eq('student_id', session.student_id)
    .eq('item_id', item_id)
    .eq('status', 'PENDING')
    .single()

  if (existingRequest) {
    throw createError({ statusCode: 400, message: 'Ya tienes una solicitud pendiente para este item' })
  }

  // Create purchase request (pending approval)
  const { data: request, error: requestError } = await client
    .from('purchase_requests')
    .insert({
      classroom_id: session.classroom_id,
      student_id: session.student_id,
      wallet_id: wallet.id,
      item_id: item.id,
      item_name: item.name,
      price: item.current_price,
      message: message || null,
      status: 'PENDING',
    })
    .select()
    .single()

  if (requestError) {
    console.error('Error creating purchase request:', requestError)
    throw createError({ statusCode: 500, message: 'Error al crear solicitud' })
  }

  return {
    data: {
      request_id: request.id,
      item_name: item.name,
      price: item.current_price,
      status: 'PENDING',
      message: 'Tu solicitud de compra está pendiente de aprobación por el docente',
    },
  }
})
