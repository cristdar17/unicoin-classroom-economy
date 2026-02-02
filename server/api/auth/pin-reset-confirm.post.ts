import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, classroom_code, temp_code, new_pin } = body

  if (!name || !classroom_code || !temp_code || !new_pin) {
    throw createError({ statusCode: 400, message: 'Todos los campos son requeridos' })
  }

  if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
    throw createError({ statusCode: 400, message: 'El PIN debe ser de 4 dígitos' })
  }

  const client = createServerSupabaseClient(event)

  // Find classroom
  const { data: classroom } = await client
    .from('classrooms')
    .select('id')
    .eq('code', classroom_code.toUpperCase())
    .single()

  if (!classroom) {
    throw createError({ statusCode: 404, message: 'Código de clase inválido' })
  }

  // Find student
  const { data: student } = await client
    .from('students')
    .select('id')
    .eq('classroom_id', classroom.id)
    .ilike('name', name.trim())
    .single()

  if (!student) {
    throw createError({ statusCode: 404, message: 'Estudiante no encontrado' })
  }

  // Find approved request with valid temp code
  const { data: request } = await client
    .from('pin_reset_requests')
    .select('id, temp_code, temp_code_expires_at')
    .eq('student_id', student.id)
    .eq('status', 'APPROVED')
    .single()

  if (!request) {
    throw createError({ statusCode: 404, message: 'No tienes una solicitud aprobada' })
  }

  // Verify temp code
  if (request.temp_code !== temp_code) {
    throw createError({ statusCode: 400, message: 'Código temporal incorrecto' })
  }

  // Check expiration
  if (new Date() > new Date(request.temp_code_expires_at)) {
    throw createError({ statusCode: 400, message: 'El código temporal ha expirado' })
  }

  // Hash new PIN
  const encoder = new TextEncoder()
  const data = encoder.encode(new_pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Update student's PIN
  const { error: updateError } = await client
    .from('students')
    .update({ pin_hash: pinHash })
    .eq('id', student.id)

  if (updateError) {
    console.error('Error updating PIN:', updateError)
    throw createError({ statusCode: 500, message: 'Error al actualizar PIN' })
  }

  // Mark request as used
  await client
    .from('pin_reset_requests')
    .update({ status: 'USED' })
    .eq('id', request.id)

  return {
    data: {
      message: 'PIN actualizado exitosamente. Ya puedes ingresar con tu nuevo PIN.'
    }
  }
})
