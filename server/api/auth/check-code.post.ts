import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body

  if (!code || code.length !== 6) {
    throw createError({
      statusCode: 400,
      message: 'Código inválido',
    })
  }

  const client = createServerSupabaseClient(event)

  const { data: classroom, error } = await client
    .from('classrooms')
    .select('name, currency_name, currency_symbol')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !classroom) {
    throw createError({
      statusCode: 404,
      message: 'Código no encontrado',
    })
  }

  return {
    data: classroom,
  }
})
