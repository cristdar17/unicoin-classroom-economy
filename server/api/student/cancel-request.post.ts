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
  const { request_id, request_type } = body

  if (!request_id || !request_type) {
    throw createError({ statusCode: 400, message: 'Datos incompletos' })
  }

  if (!['PURCHASE', 'TRANSFER'].includes(request_type)) {
    throw createError({ statusCode: 400, message: 'Tipo de solicitud inválido' })
  }

  const client = createServerSupabaseClient(event)

  // Get the request
  const table = request_type === 'PURCHASE' ? 'purchase_requests' : 'transfer_requests'
  const studentField = request_type === 'PURCHASE' ? 'student_id' : 'from_wallet_id'

  let query = client
    .from(table)
    .select('id, created_at, status, classroom_id')
    .eq('id', request_id)
    .eq('status', 'PENDING')
    .single()

  const { data: request, error: requestError } = await query

  if (requestError || !request) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada o ya procesada' })
  }

  // Verify the student owns this request
  if (request_type === 'PURCHASE') {
    const { data: purchaseReq } = await client
      .from('purchase_requests')
      .select('student_id')
      .eq('id', request_id)
      .single()

    if (purchaseReq?.student_id !== session.student_id) {
      throw createError({ statusCode: 403, message: 'No tienes permiso para cancelar esta solicitud' })
    }
  } else {
    // For transfer, check if the from_wallet belongs to the student
    const { data: wallet } = await client
      .from('wallets')
      .select('id')
      .eq('student_id', session.student_id)
      .eq('classroom_id', session.classroom_id)
      .single()

    const { data: transferReq } = await client
      .from('transfer_requests')
      .select('from_wallet_id')
      .eq('id', request_id)
      .single()

    if (transferReq?.from_wallet_id !== wallet?.id) {
      throw createError({ statusCode: 403, message: 'No tienes permiso para cancelar esta solicitud' })
    }
  }

  // Check if within 1 hour
  const createdAt = new Date(request.created_at)
  const now = new Date()
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  if (hoursDiff > 1) {
    throw createError({
      statusCode: 400,
      message: 'Solo puedes cancelar solicitudes dentro de la primera hora. Esta solicitud tiene más de 1 hora.',
    })
  }

  // Cancel the request
  const { error: updateError } = await client
    .from(table)
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', request_id)

  if (updateError) {
    console.error('Error cancelling request:', updateError)
    throw createError({ statusCode: 500, message: 'Error al cancelar solicitud' })
  }

  return {
    data: {
      success: true,
      message: 'Solicitud cancelada exitosamente',
    },
  }
})
