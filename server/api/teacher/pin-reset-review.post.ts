import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { request_id, action } = body // action: 'approve' or 'reject'

  if (!request_id || !action) {
    throw createError({ statusCode: 400, message: 'request_id y action requeridos' })
  }

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Acción inválida' })
  }

  const client = serverSupabaseServiceRole(event)

  // Get the request
  const { data: request } = await client
    .from('pin_reset_requests')
    .select('*, classroom:classrooms!inner(id, teacher_id)')
    .eq('id', request_id)
    .single()

  if (!request) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada' })
  }

  // Verify teacher owns the classroom
  if (request.classroom.teacher_id !== user.id) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta solicitud' })
  }

  if (request.status !== 'PENDING') {
    throw createError({ statusCode: 400, message: 'Esta solicitud ya fue procesada' })
  }

  if (action === 'reject') {
    // Simply reject the request
    const { error } = await client
      .from('pin_reset_requests')
      .update({
        status: 'REJECTED',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', request_id)

    if (error) {
      throw createError({ statusCode: 500, message: 'Error al rechazar solicitud' })
    }

    return {
      data: {
        message: 'Solicitud rechazada'
      }
    }
  }

  // Approve: generate temporary 6-digit code
  const tempCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // Code valid for 24 hours

  const { error } = await client
    .from('pin_reset_requests')
    .update({
      status: 'APPROVED',
      temp_code: tempCode,
      temp_code_expires_at: expiresAt.toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', request_id)

  if (error) {
    console.error('Error approving pin reset:', error)
    throw createError({ statusCode: 500, message: 'Error al aprobar solicitud' })
  }

  // Get student name for response
  const { data: student } = await client
    .from('students')
    .select('name')
    .eq('id', request.student_id)
    .single()

  return {
    data: {
      message: 'Solicitud aprobada',
      temp_code: tempCode,
      student_name: student?.name,
      expires_at: expiresAt.toISOString(),
      instructions: `Dale este código temporal al estudiante: ${tempCode}. Tiene 24 horas para usarlo.`
    }
  }
})
