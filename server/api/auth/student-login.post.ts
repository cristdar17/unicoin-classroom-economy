import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyPin } from '~/server/utils/hash'
import { createStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, name, pin } = body

  // Validate input
  if (!code || !name || !pin) {
    throw createError({ statusCode: 400, message: 'Todos los campos son requeridos' })
  }

  const client = createServerSupabaseClient(event)

  // Find classroom
  const { data: classroom, error: classroomError } = await client
    .from('classrooms')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (classroomError || !classroom) {
    throw createError({ statusCode: 404, message: 'Código de clase no encontrado' })
  }

  // Find student
  const { data: student, error: studentError } = await client
    .from('students')
    .select('id, name, pin_hash')
    .eq('classroom_id', classroom.id)
    .ilike('name', name.trim())
    .single()

  if (studentError || !student) {
    throw createError({ statusCode: 404, message: 'Estudiante no encontrado' })
  }

  // Verify PIN
  const isValidPin = await verifyPin(pin, student.pin_hash)
  if (!isValidPin) {
    throw createError({ statusCode: 401, message: 'PIN incorrecto' })
  }

  // Create JWT token
  const token = await createStudentToken({
    student_id: student.id,
    classroom_id: classroom.id,
    name: student.name,
  })

  return {
    data: { token },
  }
})
