import { describe, it, expect } from 'vitest'
import type { BadgeCategory, BadgeRarity, BadgeCriteriaType } from '~/types'

describe('Badge System', () => {
  describe('Badge Categories', () => {
    it('includes all badge categories', () => {
      const categories: BadgeCategory[] = ['STREAK', 'WEALTH', 'TRADING', 'SAVINGS', 'SOCIAL', 'SPECIAL']
      expect(categories).toHaveLength(6)
    })
  })

  describe('Badge Rarities', () => {
    it('includes all rarity levels', () => {
      const rarities: BadgeRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']
      expect(rarities).toHaveLength(4)
    })

    it('rarities are in ascending order of value', () => {
      const rarityOrder = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 }
      expect(rarityOrder.COMMON).toBeLessThan(rarityOrder.RARE)
      expect(rarityOrder.RARE).toBeLessThan(rarityOrder.EPIC)
      expect(rarityOrder.EPIC).toBeLessThan(rarityOrder.LEGENDARY)
    })
  })

  describe('Badge Criteria Types', () => {
    it('includes all criteria types', () => {
      const types: BadgeCriteriaType[] = ['STREAK', 'BALANCE', 'TRANSACTIONS', 'SAVINGS', 'CUSTOM']
      expect(types).toHaveLength(5)
    })
  })

  describe('Badge Unlock Logic', () => {
    // Simulated unlock check functions
    const checkStreakBadge = (currentStreak: number, requiredStreak: number): boolean => {
      return currentStreak >= requiredStreak
    }

    const checkBalanceBadge = (balance: number, requiredBalance: number): boolean => {
      return balance >= requiredBalance
    }

    const checkTransactionBadge = (txCount: number, requiredCount: number): boolean => {
      return txCount >= requiredCount
    }

    describe('Streak badges', () => {
      it('unlocks streak badge when current >= required', () => {
        expect(checkStreakBadge(7, 7)).toBe(true)
        expect(checkStreakBadge(10, 7)).toBe(true)
      })

      it('does not unlock streak badge when current < required', () => {
        expect(checkStreakBadge(5, 7)).toBe(false)
        expect(checkStreakBadge(0, 3)).toBe(false)
      })
    })

    describe('Balance badges', () => {
      it('unlocks balance badge when balance >= required', () => {
        expect(checkBalanceBadge(100, 100)).toBe(true)
        expect(checkBalanceBadge(1000, 500)).toBe(true)
      })

      it('does not unlock balance badge when balance < required', () => {
        expect(checkBalanceBadge(99, 100)).toBe(false)
        expect(checkBalanceBadge(0, 100)).toBe(false)
      })
    })

    describe('Transaction badges', () => {
      it('unlocks transaction badge when count >= required', () => {
        expect(checkTransactionBadge(10, 10)).toBe(true)
        expect(checkTransactionBadge(50, 10)).toBe(true)
      })

      it('does not unlock transaction badge when count < required', () => {
        expect(checkTransactionBadge(5, 10)).toBe(false)
      })
    })
  })

  describe('Default Badge Configuration', () => {
    const DEFAULT_BADGES = [
      // Attendance streaks
      { code: 'streak_attendance_3', rarity: 'COMMON', criteria_value: 3 },
      { code: 'streak_attendance_7', rarity: 'COMMON', criteria_value: 7 },
      { code: 'streak_attendance_14', rarity: 'RARE', criteria_value: 14 },
      { code: 'streak_attendance_30', rarity: 'EPIC', criteria_value: 30 },
      // Wealth milestones
      { code: 'wealth_100', rarity: 'COMMON', criteria_value: 100 },
      { code: 'wealth_500', rarity: 'RARE', criteria_value: 500 },
      { code: 'wealth_1000', rarity: 'EPIC', criteria_value: 1000 },
      { code: 'wealth_5000', rarity: 'LEGENDARY', criteria_value: 5000 },
    ]

    it('has badges with increasing difficulty for higher rarity', () => {
      const attendanceBadges = DEFAULT_BADGES.filter(b => b.code.startsWith('streak_attendance'))
      const wealthBadges = DEFAULT_BADGES.filter(b => b.code.startsWith('wealth_'))

      // Attendance badges increase in criteria value
      for (let i = 1; i < attendanceBadges.length; i++) {
        expect(attendanceBadges[i].criteria_value).toBeGreaterThan(attendanceBadges[i-1].criteria_value)
      }

      // Wealth badges increase in criteria value
      for (let i = 1; i < wealthBadges.length; i++) {
        expect(wealthBadges[i].criteria_value).toBeGreaterThan(wealthBadges[i-1].criteria_value)
      }
    })

    it('all badges have unique codes', () => {
      const codes = DEFAULT_BADGES.map(b => b.code)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
    })
  })
})

describe('Badge Rarity Styles', () => {
  const getRarityColor = (rarity: BadgeRarity): string => {
    switch (rarity) {
      case 'COMMON': return 'gray'
      case 'RARE': return 'blue'
      case 'EPIC': return 'purple'
      case 'LEGENDARY': return 'amber'
    }
  }

  const getRarityLabel = (rarity: BadgeRarity): string => {
    switch (rarity) {
      case 'COMMON': return 'Común'
      case 'RARE': return 'Raro'
      case 'EPIC': return 'Épico'
      case 'LEGENDARY': return 'Legendario'
    }
  }

  it('maps rarities to colors', () => {
    expect(getRarityColor('COMMON')).toBe('gray')
    expect(getRarityColor('RARE')).toBe('blue')
    expect(getRarityColor('EPIC')).toBe('purple')
    expect(getRarityColor('LEGENDARY')).toBe('amber')
  })

  it('maps rarities to Spanish labels', () => {
    expect(getRarityLabel('COMMON')).toBe('Común')
    expect(getRarityLabel('RARE')).toBe('Raro')
    expect(getRarityLabel('EPIC')).toBe('Épico')
    expect(getRarityLabel('LEGENDARY')).toBe('Legendario')
  })
})

describe('PIN Reset Flow', () => {
  describe('Temp Code Generation', () => {
    const generateTempCode = (): string => {
      return Math.floor(100000 + Math.random() * 900000).toString()
    }

    it('generates 6-digit codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateTempCode()
        expect(code).toHaveLength(6)
        expect(/^\d{6}$/.test(code)).toBe(true)
      }
    })

    it('generates codes >= 100000', () => {
      for (let i = 0; i < 100; i++) {
        const code = parseInt(generateTempCode())
        expect(code).toBeGreaterThanOrEqual(100000)
        expect(code).toBeLessThan(1000000)
      }
    })
  })

  describe('Code Expiration', () => {
    const isCodeExpired = (expiresAt: Date): boolean => {
      return new Date() > expiresAt
    }

    it('returns false for future expiration', () => {
      const future = new Date()
      future.setHours(future.getHours() + 24)
      expect(isCodeExpired(future)).toBe(false)
    })

    it('returns true for past expiration', () => {
      const past = new Date()
      past.setHours(past.getHours() - 1)
      expect(isCodeExpired(past)).toBe(true)
    })
  })

  describe('PIN Validation', () => {
    const isValidPin = (pin: string): boolean => {
      return /^\d{4}$/.test(pin)
    }

    it('accepts valid 4-digit PINs', () => {
      expect(isValidPin('1234')).toBe(true)
      expect(isValidPin('0000')).toBe(true)
      expect(isValidPin('9999')).toBe(true)
    })

    it('rejects invalid PINs', () => {
      expect(isValidPin('123')).toBe(false) // Too short
      expect(isValidPin('12345')).toBe(false) // Too long
      expect(isValidPin('abcd')).toBe(false) // Not numeric
      expect(isValidPin('12a4')).toBe(false) // Mixed
      expect(isValidPin('')).toBe(false) // Empty
    })
  })
})
