import type { SupabaseClient } from '@supabase/supabase-js'

interface Badge {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  criteria_type: string
  criteria_value: number | null
  criteria_streak_type: string | null
  rarity: string
  reward_amount: number
}

interface StudentBadge {
  id: string
  badge_id: string
  unlocked_at: string
  level: number
  badge: Badge
}

// Check and award badges based on current student state
export async function checkAndAwardBadges(
  client: SupabaseClient,
  studentId: string,
  classroomId: string,
  walletId: string
): Promise<{ newBadges: Badge[]; rewardTotal: number }> {
  const newBadges: Badge[] = []
  let rewardTotal = 0

  // Get all available badges for this classroom
  const { data: badges } = await client
    .from('badges')
    .select('*')
    .or(`classroom_id.eq.${classroomId},classroom_id.is.null`)
    .eq('is_active', true)

  if (!badges || badges.length === 0) return { newBadges, rewardTotal }

  // Get already unlocked badges
  const { data: unlockedBadges } = await client
    .from('student_badges')
    .select('badge_id')
    .eq('student_id', studentId)

  const unlockedIds = new Set((unlockedBadges || []).map(b => b.badge_id))

  // Get student data for checking criteria
  const [streaksResult, walletResult, transactionsResult, savingsResult] = await Promise.all([
    client
      .from('student_streaks')
      .select('*')
      .eq('student_id', studentId)
      .eq('classroom_id', classroomId),
    client
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single(),
    client
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('from_wallet_id', walletId)
      .eq('type', 'TRANSFER'),
    client
      .from('savings_accounts')
      .select('id, status', { count: 'exact' })
      .eq('student_id', studentId)
      .eq('classroom_id', classroomId)
  ])

  const streaks = streaksResult.data || []
  const wallet = walletResult.data
  const transferCount = transactionsResult.count || 0
  const savingsAccounts = savingsResult.data || []
  const completedSavings = savingsAccounts.filter(s => s.status === 'COMPLETED').length

  // Check each badge
  for (const badge of badges) {
    if (unlockedIds.has(badge.id)) continue

    let shouldUnlock = false

    switch (badge.criteria_type) {
      case 'STREAK':
        if (badge.criteria_streak_type && badge.criteria_value) {
          const streak = streaks.find(s => s.streak_type === badge.criteria_streak_type)
          if (streak && streak.best_streak >= badge.criteria_value) {
            shouldUnlock = true
          }
        }
        break

      case 'BALANCE':
        if (wallet && badge.criteria_value && wallet.balance >= badge.criteria_value) {
          shouldUnlock = true
        }
        break

      case 'TRANSACTIONS':
        if (badge.criteria_value && transferCount >= badge.criteria_value) {
          shouldUnlock = true
        }
        break

      case 'SAVINGS':
        if (badge.code === 'savings_first' && savingsAccounts.length > 0) {
          shouldUnlock = true
        } else if (badge.code === 'savings_complete' && completedSavings > 0) {
          shouldUnlock = true
        } else if (badge.code === 'savings_3' && completedSavings >= 3) {
          shouldUnlock = true
        }
        break

      case 'CUSTOM':
        // Custom badges are awarded manually or by specific triggers
        // Check for collector badge
        if (badge.code === 'special_collector') {
          if (unlockedIds.size >= 10) {
            shouldUnlock = true
          }
        }
        break
    }

    if (shouldUnlock) {
      // Award the badge
      const { error } = await client
        .from('student_badges')
        .insert({
          student_id: studentId,
          badge_id: badge.id,
          classroom_id: classroomId,
        })

      if (!error) {
        newBadges.push(badge)
        rewardTotal += badge.reward_amount || 0

        // Award reward if any
        if (badge.reward_amount > 0 && wallet) {
          await client
            .from('wallets')
            .update({ balance: wallet.balance + badge.reward_amount })
            .eq('id', walletId)

          // Record transaction
          await client.from('transactions').insert({
            from_wallet_id: null,
            to_wallet_id: walletId,
            amount: badge.reward_amount,
            type: 'EMISSION',
            reason: `🎖️ Insignia desbloqueada: ${badge.name}`,
            classroom_id: classroomId,
          })
        }
      }
    }
  }

  return { newBadges, rewardTotal }
}

// Award a specific badge by code
export async function awardBadgeByCode(
  client: SupabaseClient,
  studentId: string,
  classroomId: string,
  walletId: string,
  badgeCode: string
): Promise<Badge | null> {
  // Find the badge
  const { data: badge } = await client
    .from('badges')
    .select('*')
    .eq('code', badgeCode)
    .or(`classroom_id.eq.${classroomId},classroom_id.is.null`)
    .eq('is_active', true)
    .single()

  if (!badge) return null

  // Check if already unlocked
  const { data: existing } = await client
    .from('student_badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_id', badge.id)
    .single()

  if (existing) return null

  // Award the badge
  const { error } = await client
    .from('student_badges')
    .insert({
      student_id: studentId,
      badge_id: badge.id,
      classroom_id: classroomId,
    })

  if (error) return null

  // Award reward if any
  if (badge.reward_amount > 0) {
    const { data: wallet } = await client
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()

    if (wallet) {
      await client
        .from('wallets')
        .update({ balance: wallet.balance + badge.reward_amount })
        .eq('id', walletId)

      await client.from('transactions').insert({
        from_wallet_id: null,
        to_wallet_id: walletId,
        amount: badge.reward_amount,
        type: 'EMISSION',
        reason: `🎖️ Insignia desbloqueada: ${badge.name}`,
        classroom_id: classroomId,
      })
    }
  }

  return badge
}

// Get badge rarity color
export function getBadgeRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON': return 'gray'
    case 'RARE': return 'blue'
    case 'EPIC': return 'purple'
    case 'LEGENDARY': return 'amber'
    default: return 'gray'
  }
}

// Get badge rarity label
export function getBadgeRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'COMMON': return 'Común'
    case 'RARE': return 'Raro'
    case 'EPIC': return 'Épico'
    case 'LEGENDARY': return 'Legendario'
    default: return rarity
  }
}
