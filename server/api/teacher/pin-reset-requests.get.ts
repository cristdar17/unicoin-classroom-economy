import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const query = getQuery(event)
  const classroomId = query.classroom_id as string

  if (!classroomId) {
    throw createError({ statusCode: 400, message: 'classroom_id requerido' })
  }

  const client = serverSupabaseServiceRole(event)

  // Verify teacher owns this classroom
  const { data: classroom } = await client
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', user.id)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esta aula' })
  }

  // Get all PIN reset requests for this classroom
  const { data: requests, error } = await client
    .from('pin_reset_requests')
    .select(`
      id,
      status,
      reason,
      requested_at,
      reviewed_at,
      student:students (
        id,
        name
      )
    `)
    .eq('classroom_id', classroomId)
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('Error fetching pin reset requests:', error)
    throw createError({ statusCode: 500, message: 'Error al obtener solicitudes' })
  }

  // Separate by status
  const pending = (requests || []).filter(r => r.status === 'PENDING')
  const resolved = (requests || []).filter(r => r.status !== 'PENDING')

  return {
    data: {
      pending,
      resolved,
      pending_count: pending.length
    }
  }
})
