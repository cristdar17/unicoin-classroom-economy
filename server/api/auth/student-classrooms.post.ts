import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyPin } from '~/server/utils/hash'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, pin } = body

  if (!name || !pin) {
    throw createError({ statusCode: 400, message: 'Nombre y PIN son requeridos' })
  }

  const client = createServerSupabaseClient(event)

  // Find all students with this name (case insensitive)
  const { data: students, error: studentError } = await client
    .from('students')
    .select(`
      id,
      name,
      pin_hash,
      classroom_id,
      classrooms (
        id,
        name,
        code,
        currency_name,
        currency_symbol
      )
    `)
    .ilike('name', name.trim())

  if (studentError) {
    console.error('Error finding students:', studentError)
    throw createError({ statusCode: 500, message: 'Error al buscar estudiante' })
  }

  if (!students || students.length === 0) {
    throw createError({ statusCode: 404, message: 'Estudiante no encontrado' })
  }

  // Verify PIN for each student and collect valid classrooms
  const validClassrooms = []

  for (const student of students) {
    const isValidPin = await verifyPin(pin, student.pin_hash)
    if (isValidPin && student.classrooms) {
      validClassrooms.push({
        student_id: student.id,
        classroom: student.classrooms,
      })
    }
  }

  if (validClassrooms.length === 0) {
    throw createError({ statusCode: 401, message: 'PIN incorrecto' })
  }

  return {
    data: {
      classrooms: validClassrooms,
    },
  }
})
