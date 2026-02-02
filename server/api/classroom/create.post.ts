import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import { generateClassroomCode } from '~/server/utils/hash'
import { initializeStreakRewards } from '~/server/utils/streaks'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { name, currency_name, currency_symbol, treasury_total } = body

  if (!name || name.trim().length < 2) {
    throw createError({ statusCode: 400, message: 'El nombre es requerido' })
  }

  const client = await serverSupabaseClient(event)

  // Generate unique code
  let code = generateClassroomCode()
  let attempts = 0

  while (attempts < 10) {
    const { data: existing } = await client
      .from('classrooms')
      .select('id')
      .eq('code', code)
      .single()

    if (!existing) break

    code = generateClassroomCode()
    attempts++
  }

  if (attempts >= 10) {
    throw createError({ statusCode: 500, message: 'Error generando código único' })
  }

  // Default treasury is 10,000 coins
  const totalTreasury = treasury_total || 10000

  // Create classroom
  const { data: classroom, error } = await client
    .from('classrooms')
    .insert({
      teacher_id: user.id,
      name: name.trim(),
      code,
      currency_name: currency_name || 'Monedas',
      currency_symbol: currency_symbol || '🪙',
      treasury_total: totalTreasury,
      treasury_remaining: totalTreasury,
      settings: {
        allow_p2p_transfers: true,
        max_transfer_amount: null,
        show_leaderboard: true,
        show_economic_indicators: true,
        semester_end_date: null,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating classroom:', error)
    throw createError({ statusCode: 500, message: 'Error al crear el aula' })
  }

  // Initialize streak rewards and badges for this classroom
  try {
    const serviceClient = createServerSupabaseClient(event)
    await initializeStreakRewards(serviceClient, classroom.id)

    // Initialize default badges
    await serviceClient.rpc('initialize_default_badges', {
      p_classroom_id: classroom.id
    })
  } catch (e) {
    console.error('Error initializing classroom defaults:', e)
    // Don't fail the request, these can be added later
  }

  return { data: classroom }
})
