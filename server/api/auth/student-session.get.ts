import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Get token from header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const client = createServerSupabaseClient(event)

  // Get student
  const { data: student, error: studentError } = await client
    .from('students')
    .select('id, name, classroom_id, joined_at')
    .eq('id', session.student_id)
    .single()

  if (studentError || !student) {
    throw createError({ statusCode: 404, message: 'Estudiante no encontrado' })
  }

  // Get wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id, balance, created_at, updated_at')
    .eq('student_id', student.id)
    .single()

  // Get classroom
  const { data: classroom } = await client
    .from('classrooms')
    .select('id, name, code, currency_name, currency_symbol, settings, treasury_total, treasury_remaining')
    .eq('id', student.classroom_id)
    .single()

  return {
    data: {
      student,
      wallet,
      classroom,
    },
  }
})
