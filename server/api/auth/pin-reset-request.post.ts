import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, classroom_code, reason } = body

  if (!name || !classroom_code) {
    throw createError({ statusCode: 400, message: 'Nombre y código de clase requeridos' })
  }

  const client = createServerSupabaseClient(event)

  // Find classroom by code
  const { data: classroom } = await client
    .from('classrooms')
    .select('id, name')
    .eq('code', classroom_code.toUpperCase())
    .single()

  if (!classroom) {
    throw createError({ statusCode: 404, message: 'Código de clase inválido' })
  }

  // Find student by name in this classroom
  const { data: student } = await client
    .from('students')
    .select('id, name')
    .eq('classroom_id', classroom.id)
    .ilike('name', name.trim())
    .single()

  if (!student) {
    throw createError({
      statusCode: 404,
      message: 'No se encontró un estudiante con ese nombre en esta clase'
    })
  }

  // Check if there's already a pending request
  const { data: existingRequest } = await client
    .from('pin_reset_requests')
    .select('id')
    .eq('student_id', student.id)
    .eq('status', 'PENDING')
    .single()

  if (existingRequest) {
    throw createError({
      statusCode: 400,
      message: 'Ya tienes una solicitud pendiente. Espera a que el docente la apruebe.'
    })
  }

  // Create reset request
  const { error: insertError } = await client
    .from('pin_reset_requests')
    .insert({
      student_id: student.id,
      classroom_id: classroom.id,
      reason: reason || 'Olvidé mi PIN',
    })

  if (insertError) {
    console.error('Error creating pin reset request:', insertError)
    throw createError({ statusCode: 500, message: 'Error al crear solicitud' })
  }

  return {
    data: {
      message: 'Solicitud enviada. El docente debe aprobarla para que puedas crear un nuevo PIN.',
      classroom_name: classroom.name,
    }
  }
})
