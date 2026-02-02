import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'
import { checkAndAwardBadges } from '~/server/utils/badges'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const client = createServerSupabaseClient(event)

  // Get wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id')
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrada' })
  }

  // Check and award any new badges
  const { newBadges, rewardTotal } = await checkAndAwardBadges(
    client,
    session.student_id,
    session.classroom_id,
    wallet.id
  )

  // Get all unlocked badges for this student
  const { data: unlockedBadges, error: unlockedError } = await client
    .from('student_badges')
    .select(`
      id,
      unlocked_at,
      level,
      badge:badges (
        id,
        code,
        name,
        description,
        icon,
        category,
        rarity,
        reward_amount,
        criteria_type,
        criteria_value,
        criteria_streak_type
      )
    `)
    .eq('student_id', session.student_id)
    .eq('classroom_id', session.classroom_id)
    .order('unlocked_at', { ascending: false })

  if (unlockedError) {
    console.error('Error fetching badges:', unlockedError)
    throw createError({ statusCode: 500, message: 'Error al obtener insignias' })
  }

  // Get all available badges for this classroom (for progress tracking)
  const { data: allBadges } = await client
    .from('badges')
    .select('*')
    .or(`classroom_id.eq.${session.classroom_id},classroom_id.is.null`)
    .eq('is_active', true)
    .order('rarity', { ascending: true })

  const unlockedIds = new Set((unlockedBadges || []).map(b => b.badge?.id))
  const lockedBadges = (allBadges || []).filter(b => !unlockedIds.has(b.id))

  // Group by category
  const unlockedByCategory: Record<string, any[]> = {}
  const lockedByCategory: Record<string, any[]> = {}

  for (const badge of unlockedBadges || []) {
    if (!badge.badge) continue
    const category = badge.badge.category
    if (!unlockedByCategory[category]) unlockedByCategory[category] = []
    unlockedByCategory[category].push(badge)
  }

  for (const badge of lockedBadges) {
    const category = badge.category
    if (!lockedByCategory[category]) lockedByCategory[category] = []
    lockedByCategory[category].push(badge)
  }

  // Calculate stats
  const totalBadges = allBadges?.length || 0
  const unlockedCount = unlockedBadges?.length || 0
  const progress = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0

  // Count by rarity
  const rarityCount = {
    COMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0
  }

  for (const badge of unlockedBadges || []) {
    if (badge.badge?.rarity) {
      rarityCount[badge.badge.rarity as keyof typeof rarityCount]++
    }
  }

  return {
    data: {
      unlocked: unlockedBadges || [],
      locked: lockedBadges,
      unlocked_by_category: unlockedByCategory,
      locked_by_category: lockedByCategory,
      stats: {
        total: totalBadges,
        unlocked: unlockedCount,
        progress,
        by_rarity: rarityCount
      },
      new_badges: newBadges,
      reward_earned: rewardTotal
    }
  }
})
