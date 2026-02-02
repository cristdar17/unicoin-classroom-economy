import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Get student from token
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const query = getQuery(event)
  const classroomId = query.classroom_id as string || session.classroom_id

  const client = createServerSupabaseClient(event)

  // Get student's streaks
  const { data: streaks, error: streaksError } = await client
    .from('student_streaks')
    .select('*')
    .eq('student_id', session.student_id)
    .eq('classroom_id', classroomId)
    .order('current_streak', { ascending: false })

  if (streaksError) {
    console.error('Error fetching streaks:', streaksError)
    return { data: { streaks: [] } }
  }

  // Get rewards configuration to find next milestone for each streak
  const { data: rewards } = await client
    .from('streak_rewards')
    .select('streak_type, milestone, reward_amount, reward_name')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('milestone')

  // Add next milestone info to each streak
  const streaksWithMilestones = (streaks || []).map(streak => {
    const typeRewards = (rewards || []).filter(r => r.streak_type === streak.streak_type)
    const nextMilestone = typeRewards.find(r => r.milestone > streak.current_streak)

    return {
      ...streak,
      next_milestone: nextMilestone || null,
    }
  })

  return {
    data: {
      streaks: streaksWithMilestones,
    },
  }
})
