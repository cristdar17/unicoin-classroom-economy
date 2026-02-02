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
  const { to_student_id, amount, message } = body

  // Validate - message is now required
  if (!to_student_id || !amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'Datos inválidos' })
  }

  if (!message || message.trim().length < 3) {
    throw createError({ statusCode: 400, message: 'Debes incluir una explicación para la transferencia (mínimo 3 caracteres)' })
  }

  if (to_student_id === session.student_id) {
    throw createError({ statusCode: 400, message: 'No puedes transferirte a ti mismo' })
  }

  const client = createServerSupabaseClient(event)

  // Get sender wallet
  const { data: senderWallet, error: senderError } = await client
    .from('wallets')
    .select('id, balance')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (senderError || !senderWallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrado' })
  }

  if (senderWallet.balance < amount) {
    throw createError({ statusCode: 400, message: 'Balance insuficiente' })
  }

  // Get receiver wallet
  const { data: receiverWallet, error: receiverError } = await client
    .from('wallets')
    .select('id, balance')
    .eq('student_id', to_student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (receiverError || !receiverWallet) {
    throw createError({ statusCode: 404, message: 'Destinatario no encontrado' })
  }

  // Check for existing pending transfer to same person
  const { data: existingRequest } = await client
    .from('transfer_requests')
    .select('id')
    .eq('from_wallet_id', senderWallet.id)
    .eq('to_wallet_id', receiverWallet.id)
    .eq('status', 'PENDING')
    .single()

  if (existingRequest) {
    throw createError({ statusCode: 400, message: 'Ya tienes una transferencia pendiente a este estudiante' })
  }

  // Create transfer request (pending approval)
  const { data: request, error: requestError } = await client
    .from('transfer_requests')
    .insert({
      classroom_id: session.classroom_id,
      from_wallet_id: senderWallet.id,
      to_wallet_id: receiverWallet.id,
      amount,
      message: message.trim(),
      status: 'PENDING',
    })
    .select()
    .single()

  if (requestError) {
    console.error('Error creating transfer request:', requestError)
    throw createError({ statusCode: 500, message: 'Error al crear solicitud' })
  }

  return {
    data: {
      request_id: request.id,
      amount,
      status: 'PENDING',
      message: 'Tu solicitud de transferencia está pendiente de aprobación por el docente',
    },
  }
})
