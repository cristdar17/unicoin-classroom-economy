import { describe, it, expect } from 'vitest'

// Test utility functions for savings calculations
describe('Savings Interest Calculations', () => {
  // Helper function that mimics server-side calculation
  const calculateProjectedInterest = (amount: number, interestRate: number): number => {
    return Math.floor(amount * (interestRate / 100))
  }

  describe('calculateProjectedInterest', () => {
    it('calculates interest correctly for 7 days at 2%', () => {
      const amount = 100
      const rate = 2
      const interest = calculateProjectedInterest(amount, rate)
      expect(interest).toBe(2)
    })

    it('calculates interest correctly for 14 days at 5%', () => {
      const amount = 200
      const rate = 5
      const interest = calculateProjectedInterest(amount, rate)
      expect(interest).toBe(10)
    })

    it('calculates interest correctly for 30 days at 10%', () => {
      const amount = 500
      const rate = 10
      const interest = calculateProjectedInterest(amount, rate)
      expect(interest).toBe(50)
    })

    it('calculates interest correctly for 60 days at 18%', () => {
      const amount = 1000
      const rate = 18
      const interest = calculateProjectedInterest(amount, rate)
      expect(interest).toBe(180)
    })

    it('calculates interest correctly for 90 days at 25%', () => {
      const amount = 2000
      const rate = 25
      const interest = calculateProjectedInterest(amount, rate)
      expect(interest).toBe(500)
    })

    it('floors the result for fractional interest', () => {
      const amount = 33
      const rate = 5
      const interest = calculateProjectedInterest(amount, rate)
      // 33 * 0.05 = 1.65, should floor to 1
      expect(interest).toBe(1)
    })

    it('returns 0 for very small amounts', () => {
      const amount = 10
      const rate = 2
      const interest = calculateProjectedInterest(amount, rate)
      // 10 * 0.02 = 0.2, should floor to 0
      expect(interest).toBe(0)
    })
  })
})

describe('Savings Date Calculations', () => {
  const calculateEndDate = (lockDays: number): Date => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + lockDays)
    return endDate
  }

  const calculateDaysRemaining = (endDate: Date): number => {
    const now = new Date()
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const calculateProgress = (startDate: Date, lockDays: number): number => {
    const now = new Date()
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(100, Math.round((daysElapsed / lockDays) * 100))
  }

  describe('calculateEndDate', () => {
    it('calculates end date correctly for 7 days', () => {
      const endDate = calculateEndDate(7)
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() + 7)

      expect(endDate.getDate()).toBe(expectedDate.getDate())
      expect(endDate.getMonth()).toBe(expectedDate.getMonth())
    })

    it('calculates end date correctly for 30 days', () => {
      const endDate = calculateEndDate(30)
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() + 30)

      expect(endDate.getDate()).toBe(expectedDate.getDate())
      expect(endDate.getMonth()).toBe(expectedDate.getMonth())
    })
  })

  describe('calculateDaysRemaining', () => {
    it('returns positive days for future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      const remaining = calculateDaysRemaining(futureDate)
      expect(remaining).toBeGreaterThanOrEqual(4)
      expect(remaining).toBeLessThanOrEqual(6)
    })

    it('returns 0 for past date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      const remaining = calculateDaysRemaining(pastDate)
      expect(remaining).toBe(0)
    })
  })

  describe('calculateProgress', () => {
    it('returns 0 for just started savings', () => {
      const startDate = new Date()
      const progress = calculateProgress(startDate, 30)
      expect(progress).toBe(0)
    })

    it('returns 100 for completed savings', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const progress = calculateProgress(startDate, 30)
      expect(progress).toBe(100)
    })

    it('returns approximately 50 for half completed savings', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 15)
      const progress = calculateProgress(startDate, 30)
      expect(progress).toBeGreaterThanOrEqual(45)
      expect(progress).toBeLessThanOrEqual(55)
    })
  })
})

describe('Savings Withdrawal Logic', () => {
  const calculateFinalAmount = (
    amount: number,
    projectedInterest: number,
    isMature: boolean
  ): number => {
    return isMature ? amount + projectedInterest : amount
  }

  describe('calculateFinalAmount', () => {
    it('returns principal + interest for mature savings', () => {
      const amount = 1000
      const interest = 100
      const final = calculateFinalAmount(amount, interest, true)
      expect(final).toBe(1100)
    })

    it('returns only principal for early withdrawal', () => {
      const amount = 1000
      const interest = 100
      const final = calculateFinalAmount(amount, interest, false)
      expect(final).toBe(1000)
    })
  })

  describe('isMature check', () => {
    it('returns false for future end date', () => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 5)
      const now = new Date()
      const isMature = now >= endDate
      expect(isMature).toBe(false)
    })

    it('returns true for past end date', () => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - 1)
      const now = new Date()
      const isMature = now >= endDate
      expect(isMature).toBe(true)
    })

    it('returns true for current date equal to end date', () => {
      const endDate = new Date()
      const now = new Date()
      const isMature = now >= endDate
      expect(isMature).toBe(true)
    })
  })
})

describe('Savings Rate Validation', () => {
  const validateSavingsAmount = (
    amount: number,
    minAmount: number,
    maxAmount: number | null,
    walletBalance: number
  ): { valid: boolean; error?: string } => {
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be positive' }
    }
    if (amount < minAmount) {
      return { valid: false, error: `Minimum amount is ${minAmount}` }
    }
    if (maxAmount && amount > maxAmount) {
      return { valid: false, error: `Maximum amount is ${maxAmount}` }
    }
    if (amount > walletBalance) {
      return { valid: false, error: 'Insufficient balance' }
    }
    return { valid: true }
  }

  describe('validateSavingsAmount', () => {
    it('accepts valid amount within limits', () => {
      const result = validateSavingsAmount(100, 50, 500, 1000)
      expect(result.valid).toBe(true)
    })

    it('rejects negative amount', () => {
      const result = validateSavingsAmount(-10, 50, 500, 1000)
      expect(result.valid).toBe(false)
    })

    it('rejects amount below minimum', () => {
      const result = validateSavingsAmount(30, 50, 500, 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Minimum')
    })

    it('rejects amount above maximum', () => {
      const result = validateSavingsAmount(600, 50, 500, 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Maximum')
    })

    it('rejects amount exceeding wallet balance', () => {
      const result = validateSavingsAmount(200, 50, 500, 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient')
    })

    it('accepts amount when max is null (unlimited)', () => {
      const result = validateSavingsAmount(10000, 50, null, 20000)
      expect(result.valid).toBe(true)
    })
  })
})
