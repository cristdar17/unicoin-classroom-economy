import type { SupabaseClient } from '@supabase/supabase-js'

export type StreakType = 'ATTENDANCE' | 'PARTICIPATION' | 'BOARD' | 'HOMEWORK' | 'QUIZ'

// Map emission reasons to streak types
export const REASON_TO_STREAK: Record<string, StreakType> = {
  'attendance': 'ATTENDANCE',
  'participation': 'PARTICIPATION',
  'board': 'BOARD',
  'homework': 'HOMEWORK',
  'quiz': 'QUIZ',
}

export interface StreakResult {
  streak_type: StreakType
  current_streak: number
  best_streak: number
  is_new_best: boolean
  milestones_reached: { milestone: number; reward_amount: number; reward_name: string }[]
  total_bonus: number
}

export async function updateStreak(
  client: SupabaseClient,
  studentId: string,
  classroomId: string,
  streakType: StreakType
): Promise<StreakResult | null> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Get current streak record
  const { data: existingStreak } = await client
    .from('student_streaks')
    .select('*')
    .eq('student_id', studentId)
    .eq('classroom_id', classroomId)
    .eq('streak_type', streakType)
    .single()

  let currentStreak = 1
  let bestStreak = 1
  let isNewBest = false
  let totalCount = 1

  if (existingStreak) {
    // Check if already recorded today
    if (existingStreak.last_activity_date === today) {
      // Already recorded today, no streak update
      return null
    }

    // Check if streak continues (activity yesterday or today)
    const lastDate = existingStreak.last_activity_date
      ? new Date(existingStreak.last_activity_date)
      : null
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastDate && existingStreak.last_activity_date === yesterdayStr) {
      // Streak continues!
      currentStreak = existingStreak.current_streak + 1
    } else {
      // Streak broken, start new
      currentStreak = 1
    }

    bestStreak = Math.max(currentStreak, existingStreak.best_streak)
    isNewBest = currentStreak > existingStreak.best_streak
    totalCount = existingStreak.total_count + 1

    // Update streak
    await client
      .from('student_streaks')
      .update({
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_activity_date: today,
        total_count: totalCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingStreak.id)
  } else {
    // Create new streak record
    await client
      .from('student_streaks')
      .insert({
        student_id: studentId,
        classroom_id: classroomId,
        streak_type: streakType,
        current_streak: 1,
        best_streak: 1,
        last_activity_date: today,
        total_count: 1,
      })
  }

  // Check for milestone rewards
  const milestonesReached: { milestone: number; reward_amount: number; reward_name: string }[] = []

  // Get classroom streak rewards configuration
  const { data: rewards } = await client
    .from('streak_rewards')
    .select('milestone, reward_amount, reward_name')
    .eq('classroom_id', classroomId)
    .eq('streak_type', streakType)
    .eq('is_active', true)
    .order('milestone')

  // Check which milestones were just reached
  for (const reward of rewards || []) {
    // Only trigger if we just reached this milestone (current equals milestone)
    if (currentStreak === reward.milestone) {
      milestonesReached.push({
        milestone: reward.milestone,
        reward_amount: reward.reward_amount,
        reward_name: reward.reward_name,
      })
    }
  }

  const totalBonus = milestonesReached.reduce((sum, m) => sum + m.reward_amount, 0)

  return {
    streak_type: streakType,
    current_streak: currentStreak,
    best_streak: bestStreak,
    is_new_best: isNewBest,
    milestones_reached: milestonesReached,
    total_bonus: totalBonus,
  }
}

// Initialize default streak rewards for a classroom
export async function initializeStreakRewards(
  client: SupabaseClient,
  classroomId: string
): Promise<void> {
  const streakTypes: StreakType[] = ['ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ']
  const defaultMilestones = [
    { milestone: 3, multiplier: 10, name: 'Racha de 3' },
    { milestone: 5, multiplier: 20, name: 'Racha de 5' },
    { milestone: 7, multiplier: 35, name: 'Semana perfecta' },
    { milestone: 10, multiplier: 50, name: 'Racha de 10' },
    { milestone: 15, multiplier: 80, name: 'Racha de 15' },
    { milestone: 20, multiplier: 120, name: 'Racha de 20' },
    { milestone: 30, multiplier: 200, name: 'Mes perfecto' },
  ]

  const rewards = []

  for (const streakType of streakTypes) {
    for (const { milestone, multiplier, name } of defaultMilestones) {
      rewards.push({
        classroom_id: classroomId,
        streak_type: streakType,
        milestone,
        reward_amount: multiplier,
        reward_name: name,
      })
    }
  }

  // Insert rewards (ignore conflicts)
  await client
    .from('streak_rewards')
    .upsert(rewards, { onConflict: 'classroom_id,streak_type,milestone' })
}
