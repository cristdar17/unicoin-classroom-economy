import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const classroomId = query.classroom_id as string

  if (!classroomId) {
    throw createError({ statusCode: 400, message: 'classroom_id requerido' })
  }

  const client = createServerSupabaseClient(event)

  // Get or initialize savings rates
  let { data: rates } = await client
    .from('savings_rates')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('lock_days')

  // If no rates exist, initialize defaults
  if (!rates || rates.length === 0) {
    await client.rpc('initialize_savings_rates', { p_classroom_id: classroomId })

    const { data: newRates } = await client
      .from('savings_rates')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('lock_days')

    rates = newRates
  }

  return {
    data: rates || [],
  }
})
