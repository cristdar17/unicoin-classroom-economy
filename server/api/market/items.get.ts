import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { classroom_id } = query

  if (!classroom_id) {
    throw createError({ statusCode: 400, message: 'classroom_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  const { data, error } = await client
    .from('market_items')
    .select('*')
    .eq('classroom_id', classroom_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching market items:', error)
    throw createError({ statusCode: 500, message: 'Error al cargar items' })
  }

  return { data: data || [] }
})
