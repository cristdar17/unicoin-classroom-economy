import { createServerSupabaseClient } from '~/server/utils/supabase'
import { hashPin } from '~/server/utils/hash'
import { createStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, name, pin } = body

  // Validate input
  if (!code || code.length !== 6) {
    throw createError({ statusCode: 400, message: 'Código inválido' })
  }
  if (!name || name.trim().length < 2) {
    throw createError({ statusCode: 400, message: 'Nombre inválido' })
  }
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, message: 'El PIN debe ser de 4 dígitos' })
  }

  const client = createServerSupabaseClient(event)

  // Find classroom
  const { data: classroom, error: classroomError } = await client
    .from('classrooms')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (classroomError || !classroom) {
    throw createError({ statusCode: 404, message: 'Código no encontrado' })
  }

  // Check if student already exists
  const { data: existingStudent } = await client
    .from('students')
    .select('id')
    .eq('classroom_id', classroom.id)
    .ilike('name', name.trim())
    .single()

  if (existingStudent) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un estudiante con ese nombre en esta clase. Usa la opción de ingresar.',
    })
  }

  // Hash PIN
  const pinHash = await hashPin(pin)

  // Create student
  const { data: student, error: studentError } = await client
    .from('students')
    .insert({
      name: name.trim(),
      pin_hash: pinHash,
      classroom_id: classroom.id,
    })
    .select()
    .single()

  if (studentError) {
    console.error('Error creating student:', studentError)
    throw createError({ statusCode: 500, message: 'Error al crear estudiante' })
  }

  // Create wallet
  const { error: walletError } = await client
    .from('wallets')
    .insert({
      student_id: student.id,
      classroom_id: classroom.id,
      balance: 0,
    })

  if (walletError) {
    console.error('Error creating wallet:', walletError)
    // Try to clean up student
    await client.from('students').delete().eq('id', student.id)
    throw createError({ statusCode: 500, message: 'Error al crear wallet' })
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
