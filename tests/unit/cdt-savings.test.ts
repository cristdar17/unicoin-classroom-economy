/**
 * CDT/Savings System Tests
 * Tests for savings accounts, interest calculations, and bonus rates
 */
import { describe, it, expect } from 'vitest'

interface SavingsRate {
  id: string
  lock_days: number
  interest_rate: number
  min_amount: number
  max_amount: number | null
  bonus_rate_threshold: number | null
  bonus_rate: number
  description: string | null
}

interface SavingsAccount {
  id: string
  amount: number
  interest_rate: number
  projected_interest: number
  lock_days: number
  start_date: string
  end_date: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
}

describe('CDT/Savings System', () => {
  // Sample rates matching the production configuration
  const sampleRates: SavingsRate[] = [
    { id: '1', lock_days: 7, interest_rate: 2, min_amount: 10, max_amount: null, bonus_rate_threshold: 100, bonus_rate: 0.5, description: 'Corto plazo' },
    { id: '2', lock_days: 14, interest_rate: 5, min_amount: 20, max_amount: null, bonus_rate_threshold: 200, bonus_rate: 1, description: 'Quincenal' },
    { id: '3', lock_days: 30, interest_rate: 10, min_amount: 50, max_amount: null, bonus_rate_threshold: 300, bonus_rate: 1.5, description: 'Mensual' },
    { id: '4', lock_days: 60, interest_rate: 18, min_amount: 100, max_amount: null, bonus_rate_threshold: 500, bonus_rate: 2.5, description: 'Bimensual' },
    { id: '5', lock_days: 90, interest_rate: 25, min_amount: 200, max_amount: null, bonus_rate_threshold: 1000, bonus_rate: 4, description: 'Trimestral' },
  ]

  describe('Interest Rate Calculations', () => {
    it('should calculate base interest correctly', () => {
      const calculateInterest = (amount: number, rate: number) => {
        return Math.floor(amount * (rate / 100))
      }

      expect(calculateInterest(100, 10)).toBe(10)
      expect(calculateInterest(500, 25)).toBe(125)
      expect(calculateInterest(1000, 2)).toBe(20)
      expect(calculateInterest(50, 5)).toBe(2)
    })

    it('should apply bonus rate when threshold is met', () => {
      const calculateTotalRate = (
        amount: number,
        baseRate: number,
        bonusThreshold: number | null,
        bonusRate: number
      ) => {
        if (bonusThreshold && amount >= bonusThreshold) {
          return baseRate + bonusRate
        }
        return baseRate
      }

      // 7-day rate: base 2%, bonus 0.5% at 100+
      expect(calculateTotalRate(50, 2, 100, 0.5)).toBe(2) // No bonus
      expect(calculateTotalRate(100, 2, 100, 0.5)).toBe(2.5) // With bonus
      expect(calculateTotalRate(200, 2, 100, 0.5)).toBe(2.5) // With bonus

      // 90-day rate: base 25%, bonus 4% at 1000+
      expect(calculateTotalRate(500, 25, 1000, 4)).toBe(25) // No bonus
      expect(calculateTotalRate(1000, 25, 1000, 4)).toBe(29) // With bonus
      expect(calculateTotalRate(2000, 25, 1000, 4)).toBe(29) // With bonus
    })

    it('should calculate projected interest with bonus', () => {
      const calculateProjectedInterest = (
        amount: number,
        rate: SavingsRate
      ) => {
        let totalRate = rate.interest_rate
        if (rate.bonus_rate_threshold && amount >= rate.bonus_rate_threshold) {
          totalRate += rate.bonus_rate
        }
        return Math.floor(amount * (totalRate / 100))
      }

      const rate90days = sampleRates[4] // 25% base, 4% bonus at 1000+

      // Without bonus
      expect(calculateProjectedInterest(500, rate90days)).toBe(125) // 500 * 25%

      // With bonus
      expect(calculateProjectedInterest(1000, rate90days)).toBe(290) // 1000 * 29%
      expect(calculateProjectedInterest(2000, rate90days)).toBe(580) // 2000 * 29%
    })

    it('should calculate final amount correctly', () => {
      const calculateFinalAmount = (amount: number, interest: number) => {
        return amount + interest
      }

      expect(calculateFinalAmount(100, 10)).toBe(110)
      expect(calculateFinalAmount(1000, 290)).toBe(1290)
      expect(calculateFinalAmount(500, 125)).toBe(625)
    })
  })

  describe('Lock Period Validation', () => {
    it('should calculate end date correctly', () => {
      const calculateEndDate = (startDate: Date, lockDays: number) => {
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + lockDays)
        return endDate
      }

      const start = new Date('2024-01-01')

      expect(calculateEndDate(start, 7).toISOString().split('T')[0]).toBe('2024-01-08')
      expect(calculateEndDate(start, 14).toISOString().split('T')[0]).toBe('2024-01-15')
      expect(calculateEndDate(start, 30).toISOString().split('T')[0]).toBe('2024-01-31')
      expect(calculateEndDate(start, 60).toISOString().split('T')[0]).toBe('2024-03-01')
      expect(calculateEndDate(start, 90).toISOString().split('T')[0]).toBe('2024-03-31')
    })

    it('should check if savings is mature', () => {
      const isMature = (endDate: string) => {
        return new Date() >= new Date(endDate)
      }

      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const futureDate = new Date(Date.now() + 86400000).toISOString()

      expect(isMature(pastDate)).toBe(true)
      expect(isMature(futureDate)).toBe(false)
    })

    it('should calculate days remaining correctly', () => {
      const calculateDaysRemaining = (endDate: string) => {
        const end = new Date(endDate)
        const now = new Date()
        const diffTime = end.getTime() - now.getTime()
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }

      const tomorrow = new Date(Date.now() + 86400000).toISOString()
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()

      expect(calculateDaysRemaining(tomorrow)).toBe(1)
      expect(calculateDaysRemaining(yesterday)).toBe(0)
      expect(calculateDaysRemaining(nextWeek)).toBe(7)
    })

    it('should calculate progress percentage', () => {
      const calculateProgress = (startDate: string, endDate: string) => {
        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()
        const now = Date.now()

        if (now >= end) return 100
        if (now <= start) return 0

        return Math.round(((now - start) / (end - start)) * 100)
      }

      const start = new Date(Date.now() - 5 * 86400000).toISOString() // 5 days ago
      const end = new Date(Date.now() + 5 * 86400000).toISOString() // 5 days from now

      const progress = calculateProgress(start, end)
      expect(progress).toBeGreaterThanOrEqual(45)
      expect(progress).toBeLessThanOrEqual(55) // Around 50%
    })
  })

  describe('Amount Validation', () => {
    it('should enforce minimum amount', () => {
      const validateAmount = (amount: number, rate: SavingsRate) => {
        if (amount < rate.min_amount) {
          return { valid: false, error: `Monto mínimo: ${rate.min_amount}` }
        }
        return { valid: true }
      }

      const rate = sampleRates[2] // min_amount: 50

      expect(validateAmount(50, rate).valid).toBe(true)
      expect(validateAmount(100, rate).valid).toBe(true)
      expect(validateAmount(49, rate).valid).toBe(false)
      expect(validateAmount(0, rate).valid).toBe(false)
    })

    it('should enforce maximum amount when set', () => {
      const validateAmount = (amount: number, rate: SavingsRate) => {
        if (rate.max_amount && amount > rate.max_amount) {
          return { valid: false, error: `Monto máximo: ${rate.max_amount}` }
        }
        return { valid: true }
      }

      const rateWithMax: SavingsRate = { ...sampleRates[0], max_amount: 1000 }
      const rateWithoutMax = sampleRates[0]

      expect(validateAmount(500, rateWithMax).valid).toBe(true)
      expect(validateAmount(1000, rateWithMax).valid).toBe(true)
      expect(validateAmount(1001, rateWithMax).valid).toBe(false)
      expect(validateAmount(10000, rateWithoutMax).valid).toBe(true) // No max
    })

    it('should check if user can afford deposit', () => {
      const canAfford = (balance: number, amount: number) => balance >= amount

      expect(canAfford(100, 50)).toBe(true)
      expect(canAfford(100, 100)).toBe(true)
      expect(canAfford(100, 101)).toBe(false)
      expect(canAfford(0, 1)).toBe(false)
    })
  })

  describe('Early Withdrawal', () => {
    it('should return only principal on early withdrawal', () => {
      const calculateEarlyWithdrawal = (account: SavingsAccount) => {
        // On early withdrawal, student loses all interest
        return account.amount
      }

      const account: SavingsAccount = {
        id: '1',
        amount: 1000,
        interest_rate: 25,
        projected_interest: 250,
        lock_days: 90,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 86400000).toISOString(),
        status: 'ACTIVE'
      }

      expect(calculateEarlyWithdrawal(account)).toBe(1000)
    })

    it('should return principal + interest on mature withdrawal', () => {
      const calculateMatureWithdrawal = (account: SavingsAccount) => {
        return account.amount + account.projected_interest
      }

      const account: SavingsAccount = {
        id: '1',
        amount: 1000,
        interest_rate: 25,
        projected_interest: 250,
        lock_days: 90,
        start_date: new Date(Date.now() - 100 * 86400000).toISOString(),
        end_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        status: 'ACTIVE'
      }

      expect(calculateMatureWithdrawal(account)).toBe(1250)
    })
  })

  describe('Active Savings Constraints', () => {
    it('should prevent duplicate active savings of same type', () => {
      const activeSavings: SavingsAccount[] = [
        { id: '1', amount: 100, interest_rate: 2, projected_interest: 2, lock_days: 7, start_date: '', end_date: '', status: 'ACTIVE' },
        { id: '2', amount: 200, interest_rate: 10, projected_interest: 20, lock_days: 30, start_date: '', end_date: '', status: 'ACTIVE' },
      ]

      const hasActiveOfType = (lockDays: number) => {
        return activeSavings.some(s => s.lock_days === lockDays && s.status === 'ACTIVE')
      }

      expect(hasActiveOfType(7)).toBe(true)
      expect(hasActiveOfType(14)).toBe(false)
      expect(hasActiveOfType(30)).toBe(true)
      expect(hasActiveOfType(90)).toBe(false)
    })
  })

  describe('Savings Summary', () => {
    it('should calculate total locked amount', () => {
      const accounts: SavingsAccount[] = [
        { id: '1', amount: 100, interest_rate: 2, projected_interest: 2, lock_days: 7, start_date: '', end_date: '', status: 'ACTIVE' },
        { id: '2', amount: 500, interest_rate: 10, projected_interest: 50, lock_days: 30, start_date: '', end_date: '', status: 'ACTIVE' },
        { id: '3', amount: 200, interest_rate: 5, projected_interest: 10, lock_days: 14, start_date: '', end_date: '', status: 'COMPLETED' },
      ]

      const totalLocked = accounts
        .filter(a => a.status === 'ACTIVE')
        .reduce((sum, a) => sum + a.amount, 0)

      expect(totalLocked).toBe(600)
    })

    it('should calculate total projected interest', () => {
      const accounts: SavingsAccount[] = [
        { id: '1', amount: 100, interest_rate: 2, projected_interest: 2, lock_days: 7, start_date: '', end_date: '', status: 'ACTIVE' },
        { id: '2', amount: 500, interest_rate: 10, projected_interest: 50, lock_days: 30, start_date: '', end_date: '', status: 'ACTIVE' },
      ]

      const totalProjectedInterest = accounts
        .filter(a => a.status === 'ACTIVE')
        .reduce((sum, a) => sum + a.projected_interest, 0)

      expect(totalProjectedInterest).toBe(52)
    })
  })

  describe('Lock Days Labels', () => {
    it('should return correct labels for lock periods', () => {
      const getLockDaysLabel = (days: number) => {
        if (days === 7) return '1 semana'
        if (days === 14) return '2 semanas'
        if (days === 30) return '1 mes'
        if (days === 60) return '2 meses'
        if (days === 90) return '3 meses'
        return `${days} días`
      }

      expect(getLockDaysLabel(7)).toBe('1 semana')
      expect(getLockDaysLabel(14)).toBe('2 semanas')
      expect(getLockDaysLabel(30)).toBe('1 mes')
      expect(getLockDaysLabel(60)).toBe('2 meses')
      expect(getLockDaysLabel(90)).toBe('3 meses')
      expect(getLockDaysLabel(45)).toBe('45 días')
    })
  })
})
