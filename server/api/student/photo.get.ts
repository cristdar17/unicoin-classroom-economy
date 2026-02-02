import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const client = createServerSupabaseClient(event)

  const { data: student } = await client
    .from('students')
    .select('photo_url')
    .eq('id', session.student_id)
    .single()

  return {
    data: {
      photo_url: student?.photo_url || null
    }
  }
})
