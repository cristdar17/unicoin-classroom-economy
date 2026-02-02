import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { classroom_id } = body

  if (!classroom_id) {
    throw createError({ statusCode: 400, message: 'classroom_id requerido' })
  }

  const client = serverSupabaseServiceRole(event)

  // Verify teacher owns this classroom
  const { data: classroom } = await client
    .from('classrooms')
    .select('id')
    .eq('id', classroom_id)
    .eq('teacher_id', user.id)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta aula' })
  }

  // Initialize default badges
  const { error } = await client.rpc('initialize_default_badges', {
    p_classroom_id: classroom_id
  })

  if (error) {
    console.error('Error initializing badges:', error)
    throw createError({ statusCode: 500, message: 'Error al inicializar insignias' })
  }

  // Get the created badges
  const { data: badges } = await client
    .from('badges')
    .select('*')
    .eq('classroom_id', classroom_id)
    .order('category')
    .order('criteria_value')

  return {
    data: {
      badges,
      message: `Se crearon ${badges?.length || 0} insignias para el aula`
    }
  }
})
