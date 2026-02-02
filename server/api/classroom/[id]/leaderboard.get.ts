import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const classroomId = getRouterParam(event, 'id')

  if (!classroomId) {
    throw createError({ statusCode: 400, message: 'ID de aula requerido' })
  }

  const client = createServerSupabaseClient(event)

  const { data, error } = await client
    .from('wallets')
    .select(`
      balance,
      students (
        id,
        name
      )
    `)
    .eq('classroom_id', classroomId)
    .order('balance', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    throw createError({ statusCode: 500, message: 'Error al cargar ranking' })
  }

  const leaderboard = (data || []).map((entry, index) => ({
    rank: index + 1,
    student_id: entry.students?.id,
    student_name: entry.students?.name,
    balance: entry.balance,
  }))

  return { data: leaderboard }
})
