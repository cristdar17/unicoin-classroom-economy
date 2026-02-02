/**
 * Streak System Tests
 * Tests for student activity streaks and rewards
 */
import { describe, it, expect } from 'vitest'

type StreakType = 'ATTENDANCE' | 'PARTICIPATION' | 'BOARD' | 'HOMEWORK' | 'QUIZ'

interface StudentStreak {
  id: string
  student_id: string
  streak_type: StreakType
  current_streak: number
  best_streak: number
  last_activity_date: string | null
  total_count: number
}

interface StreakReward {
  streak_type: StreakType
  milestone: number
  reward_amount: number
  reward_name: string
}

describe('Streak System', () => {
  describe('Streak Types', () => {
    it('should have all valid streak types', () => {
      const validTypes: StreakType[] = ['ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ']

      validTypes.forEach(type => {
        expect(['ATTENDANCE', 'PARTICIPATION', 'BOARD', 'HOMEWORK', 'QUIZ']).toContain(type)
      })
    })

    it('should map streak types to emission reasons', () => {
      const streakTypeMapping: Record<string, StreakType> = {
        'attendance': 'ATTENDANCE',
        'participation': 'PARTICIPATION',
        'board': 'BOARD',
        'homework': 'HOMEWORK',
        'quiz': 'QUIZ'
      }

      expect(streakTypeMapping['attendance']).toBe('ATTENDANCE')
      expect(streakTypeMapping['participation']).toBe('PARTICIPATION')
      expect(streakTypeMapping['board']).toBe('BOARD')
    })
  })

  describe('Streak Calculation', () => {
    it('should increment streak for consecutive days', () => {
      const incrementStreak = (
        currentStreak: number,
        lastActivityDate: string | null,
        today: string
      ): number => {
        if (!lastActivityDate) return 1 // First activity

        const last = new Date(lastActivityDate)
        const current = new Date(today)
        const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return currentStreak // Same day, no change
        if (diffDays === 1) return currentStreak + 1 // Consecutive day
        return 1 // Streak broken, reset
      }

      expect(incrementStreak(5, '2024-01-05', '2024-01-06')).toBe(6) // Consecutive
      expect(incrementStreak(5, '2024-01-05', '2024-01-05')).toBe(5) // Same day
      expect(incrementStreak(5, '2024-01-05', '2024-01-07')).toBe(1) // Broken
      expect(incrementStreak(0, null, '2024-01-01')).toBe(1) // First activity
    })

    it('should update best streak when current exceeds it', () => {
      const updateBestStreak = (currentStreak: number, bestStreak: number) => {
        return Math.max(currentStreak, bestStreak)
      }

      expect(updateBestStreak(10, 5)).toBe(10) // New best
      expect(updateBestStreak(5, 10)).toBe(10) // Keep existing best
      expect(updateBestStreak(10, 10)).toBe(10) // Equal
    })

    it('should reset streak when activity is missed', () => {
      const shouldResetStreak = (
        lastActivityDate: string | null,
        today: string
      ): boolean => {
        if (!lastActivityDate) return false

        const last = new Date(lastActivityDate)
        const current = new Date(today)
        const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

        return diffDays > 1
      }

      expect(shouldResetStreak('2024-01-05', '2024-01-06')).toBe(false) // Consecutive
      expect(shouldResetStreak('2024-01-05', '2024-01-07')).toBe(true) // Missed one day
      expect(shouldResetStreak('2024-01-05', '2024-01-10')).toBe(true) // Missed multiple days
      expect(shouldResetStreak(null, '2024-01-01')).toBe(false) // First activity
    })

    it('should handle same day activity correctly', () => {
      const isSameDay = (date1: string, date2: string) => {
        return new Date(date1).toDateString() === new Date(date2).toDateString()
      }

      expect(isSameDay('2024-01-05', '2024-01-05')).toBe(true)
      expect(isSameDay('2024-01-05T10:00:00', '2024-01-05T18:00:00')).toBe(true)
      expect(isSameDay('2024-01-05', '2024-01-06')).toBe(false)
    })
  })

  describe('Streak Rewards', () => {
    const defaultMilestones = [3, 5, 7, 10, 15, 20, 30]

    it('should identify milestone achievements', () => {
      const checkMilestone = (streak: number, milestones: number[]) => {
        return milestones.includes(streak)
      }

      expect(checkMilestone(3, defaultMilestones)).toBe(true)
      expect(checkMilestone(7, defaultMilestones)).toBe(true)
      expect(checkMilestone(30, defaultMilestones)).toBe(true)
      expect(checkMilestone(4, defaultMilestones)).toBe(false)
      expect(checkMilestone(25, defaultMilestones)).toBe(false)
    })

    it('should calculate reward for milestone', () => {
      const rewards: StreakReward[] = [
        { streak_type: 'ATTENDANCE', milestone: 3, reward_amount: 5, reward_name: 'Racha de 3 días' },
        { streak_type: 'ATTENDANCE', milestone: 7, reward_amount: 15, reward_name: 'Racha de 7 días' },
        { streak_type: 'ATTENDANCE', milestone: 30, reward_amount: 100, reward_name: 'Racha de 30 días' },
      ]

      const getReward = (streakType: StreakType, milestone: number) => {
        return rewards.find(r => r.streak_type === streakType && r.milestone === milestone)
      }

      expect(getReward('ATTENDANCE', 3)?.reward_amount).toBe(5)
      expect(getReward('ATTENDANCE', 7)?.reward_amount).toBe(15)
      expect(getReward('ATTENDANCE', 30)?.reward_amount).toBe(100)
      expect(getReward('ATTENDANCE', 4)).toBeUndefined()
    })

    it('should calculate bonus for streak achievements', () => {
      const calculateStreakBonus = (
        streak: number,
        milestones: number[],
        baseReward: number
      ): number => {
        if (!milestones.includes(streak)) return 0

        // Higher milestones = higher multiplier
        const milestoneIndex = milestones.indexOf(streak)
        const multiplier = 1 + (milestoneIndex * 0.5)

        return Math.round(baseReward * multiplier)
      }

      expect(calculateStreakBonus(3, defaultMilestones, 10)).toBe(10) // 1x
      expect(calculateStreakBonus(5, defaultMilestones, 10)).toBe(15) // 1.5x
      expect(calculateStreakBonus(7, defaultMilestones, 10)).toBe(20) // 2x
      expect(calculateStreakBonus(4, defaultMilestones, 10)).toBe(0) // Not a milestone
    })
  })

  describe('Streak Display', () => {
    it('should format streak for display', () => {
      const formatStreak = (streak: StudentStreak) => {
        return {
          type: streak.streak_type,
          current: streak.current_streak,
          best: streak.best_streak,
          isActive: streak.current_streak > 0,
          emoji: getStreakEmoji(streak.streak_type)
        }
      }

      const getStreakEmoji = (type: StreakType): string => {
        const emojis: Record<StreakType, string> = {
          'ATTENDANCE': '✅',
          'PARTICIPATION': '🙋',
          'BOARD': '📝',
          'HOMEWORK': '📚',
          'QUIZ': '📋'
        }
        return emojis[type]
      }

      const streak: StudentStreak = {
        id: '1',
        student_id: 's1',
        streak_type: 'ATTENDANCE',
        current_streak: 5,
        best_streak: 10,
        last_activity_date: '2024-01-05',
        total_count: 50
      }

      const display = formatStreak(streak)

      expect(display.current).toBe(5)
      expect(display.best).toBe(10)
      expect(display.isActive).toBe(true)
      expect(display.emoji).toBe('✅')
    })

    it('should get correct streak icon', () => {
      const getStreakIcon = (type: StreakType): string => {
        const icons: Record<StreakType, string> = {
          'ATTENDANCE': '✅',
          'PARTICIPATION': '🙋',
          'BOARD': '📝',
          'HOMEWORK': '📚',
          'QUIZ': '📋'
        }
        return icons[type] || '🔥'
      }

      expect(getStreakIcon('ATTENDANCE')).toBe('✅')
      expect(getStreakIcon('PARTICIPATION')).toBe('🙋')
      expect(getStreakIcon('BOARD')).toBe('📝')
      expect(getStreakIcon('HOMEWORK')).toBe('📚')
      expect(getStreakIcon('QUIZ')).toBe('📋')
    })

    it('should calculate streak fire level', () => {
      const getFireLevel = (streak: number): 'cold' | 'warm' | 'hot' | 'blazing' => {
        if (streak === 0) return 'cold'
        if (streak < 5) return 'warm'
        if (streak < 10) return 'hot'
        return 'blazing'
      }

      expect(getFireLevel(0)).toBe('cold')
      expect(getFireLevel(3)).toBe('warm')
      expect(getFireLevel(7)).toBe('hot')
      expect(getFireLevel(15)).toBe('blazing')
    })
  })

  describe('Multiple Streaks', () => {
    it('should track multiple streak types per student', () => {
      const studentStreaks: StudentStreak[] = [
        { id: '1', student_id: 's1', streak_type: 'ATTENDANCE', current_streak: 5, best_streak: 10, last_activity_date: '2024-01-05', total_count: 50 },
        { id: '2', student_id: 's1', streak_type: 'PARTICIPATION', current_streak: 3, best_streak: 7, last_activity_date: '2024-01-05', total_count: 30 },
        { id: '3', student_id: 's1', streak_type: 'BOARD', current_streak: 0, best_streak: 5, last_activity_date: '2024-01-01', total_count: 15 },
      ]

      const activeStreaks = studentStreaks.filter(s => s.current_streak > 0)
      const totalCurrentStreak = studentStreaks.reduce((sum, s) => sum + s.current_streak, 0)

      expect(activeStreaks.length).toBe(2)
      expect(totalCurrentStreak).toBe(8)
    })

    it('should find best performing streak', () => {
      const studentStreaks: StudentStreak[] = [
        { id: '1', student_id: 's1', streak_type: 'ATTENDANCE', current_streak: 5, best_streak: 10, last_activity_date: '2024-01-05', total_count: 50 },
        { id: '2', student_id: 's1', streak_type: 'PARTICIPATION', current_streak: 12, best_streak: 12, last_activity_date: '2024-01-05', total_count: 30 },
        { id: '3', student_id: 's1', streak_type: 'BOARD', current_streak: 7, best_streak: 7, last_activity_date: '2024-01-05', total_count: 15 },
      ]

      const bestCurrentStreak = studentStreaks.reduce((best, current) =>
        current.current_streak > best.current_streak ? current : best
      )

      expect(bestCurrentStreak.streak_type).toBe('PARTICIPATION')
      expect(bestCurrentStreak.current_streak).toBe(12)
    })
  })

  describe('Streak Statistics', () => {
    it('should calculate total activities across all streaks', () => {
      const streaks: StudentStreak[] = [
        { id: '1', student_id: 's1', streak_type: 'ATTENDANCE', current_streak: 5, best_streak: 10, last_activity_date: '2024-01-05', total_count: 50 },
        { id: '2', student_id: 's1', streak_type: 'PARTICIPATION', current_streak: 3, best_streak: 7, last_activity_date: '2024-01-05', total_count: 30 },
      ]

      const totalActivities = streaks.reduce((sum, s) => sum + s.total_count, 0)

      expect(totalActivities).toBe(80)
    })

    it('should calculate best streak across all types', () => {
      const streaks: StudentStreak[] = [
        { id: '1', student_id: 's1', streak_type: 'ATTENDANCE', current_streak: 5, best_streak: 10, last_activity_date: '2024-01-05', total_count: 50 },
        { id: '2', student_id: 's1', streak_type: 'PARTICIPATION', current_streak: 3, best_streak: 15, last_activity_date: '2024-01-05', total_count: 30 },
      ]

      const overallBest = Math.max(...streaks.map(s => s.best_streak))

      expect(overallBest).toBe(15)
    })
  })
})
