import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const classroomId = getRouterParam(event, 'id')

  if (!classroomId) {
    throw createError({ statusCode: 400, message: 'ID de aula requerido' })
  }

  const client = await serverSupabaseClient(event)

  const { data: students, error } = await client
    .from('students')
    .select(`
      id,
      name,
      joined_at,
      photo_url,
      wallets (
        id,
        balance,
        created_at,
        updated_at
      )
    `)
    .eq('classroom_id', classroomId)
    .order('name')

  if (error) {
    console.error('Error fetching students:', error)
    throw createError({ statusCode: 500, message: 'Error al cargar estudiantes' })
  }

  // Flatten wallet data
  const studentsWithWallets = (students || []).map(s => ({
    ...s,
    wallet: s.wallets?.[0] || { id: '', balance: 0, created_at: '', updated_at: '' },
    wallets: undefined,
  }))

  return { data: studentsWithWallets }
})
