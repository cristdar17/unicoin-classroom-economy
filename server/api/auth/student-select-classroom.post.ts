import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyPin } from '~/server/utils/hash'
import { createStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { student_id, classroom_id, pin } = body

  if (!student_id || !classroom_id || !pin) {
    throw createError({ statusCode: 400, message: 'Datos incompletos' })
  }

  const client = createServerSupabaseClient(event)

  // Verify student and PIN
  const { data: student, error: studentError } = await client
    .from('students')
    .select('id, name, pin_hash, classroom_id')
    .eq('id', student_id)
    .eq('classroom_id', classroom_id)
    .single()

  if (studentError || !student) {
    throw createError({ statusCode: 404, message: 'Estudiante no encontrado' })
  }

  const isValidPin = await verifyPin(pin, student.pin_hash)
  if (!isValidPin) {
    throw createError({ statusCode: 401, message: 'PIN incorrecto' })
  }

  // Create token for this specific classroom
  const token = await createStudentToken({
    student_id: student.id,
    classroom_id: classroom_id,
    name: student.name,
  })

  return {
    data: { token },
  }
})
