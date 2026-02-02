import { describe, it, expect } from 'vitest'

// Economic indicator calculations
describe('Economic Indicators', () => {
  describe('Gini Index Calculation', () => {
    // Gini index formula: measures wealth inequality (0 = perfect equality, 1 = perfect inequality)
    const calculateGini = (balances: number[]): number => {
      if (balances.length === 0) return 0
      const n = balances.length
      const sorted = [...balances].sort((a, b) => a - b)
      const mean = sorted.reduce((a, b) => a + b, 0) / n

      if (mean === 0) return 0

      let sumOfDifferences = 0
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sumOfDifferences += Math.abs(sorted[i] - sorted[j])
        }
      }

      return sumOfDifferences / (2 * n * n * mean)
    }

    it('returns 0 for perfect equality', () => {
      const balances = [100, 100, 100, 100]
      const gini = calculateGini(balances)
      expect(gini).toBeCloseTo(0, 5)
    })

    it('returns value close to 1 for high inequality', () => {
      const balances = [0, 0, 0, 1000]
      const gini = calculateGini(balances)
      expect(gini).toBeGreaterThan(0.7)
    })

    it('returns moderate value for typical distribution', () => {
      const balances = [50, 100, 150, 200, 500]
      const gini = calculateGini(balances)
      expect(gini).toBeGreaterThan(0.2)
      expect(gini).toBeLessThan(0.6)
    })

    it('handles empty array', () => {
      const gini = calculateGini([])
      expect(gini).toBe(0)
    })

    it('handles single element', () => {
      const gini = calculateGini([100])
      expect(gini).toBe(0)
    })
  })

  describe('Palma Ratio Calculation', () => {
    // Palma ratio: income share of top 10% divided by income share of bottom 40%
    const calculatePalma = (balances: number[]): number => {
      if (balances.length < 10) return 0
      const sorted = [...balances].sort((a, b) => a - b)
      const total = sorted.reduce((a, b) => a + b, 0)

      if (total === 0) return 0

      const bottom40Index = Math.ceil(sorted.length * 0.4)
      const top10Index = Math.floor(sorted.length * 0.9)

      const bottom40Sum = sorted.slice(0, bottom40Index).reduce((a, b) => a + b, 0)
      const top10Sum = sorted.slice(top10Index).reduce((a, b) => a + b, 0)

      if (bottom40Sum === 0) return Infinity

      return top10Sum / bottom40Sum
    }

    it('returns balanced ratio for equal distribution', () => {
      const balances = Array(20).fill(100)
      const palma = calculatePalma(balances)
      // For equal distribution: top 10% has 10% of wealth, bottom 40% has 40% of wealth
      // Palma = 10/40 = 0.25
      expect(palma).toBeCloseTo(0.25, 1)
    })

    it('returns high ratio for unequal distribution', () => {
      const balances = [
        ...Array(18).fill(10),
        500,
        1000
      ]
      const palma = calculatePalma(balances)
      expect(palma).toBeGreaterThan(2)
    })

    it('returns 0 for insufficient data', () => {
      const palma = calculatePalma([100, 200, 300])
      expect(palma).toBe(0)
    })
  })

  describe('Inflation Calculation', () => {
    const calculateInflation = (currentSupply: number, previousSupply: number): number => {
      if (previousSupply === 0) return 0
      return ((currentSupply - previousSupply) / previousSupply) * 100
    }

    it('returns positive for increased supply', () => {
      const inflation = calculateInflation(1100, 1000)
      expect(inflation).toBe(10)
    })

    it('returns negative for decreased supply', () => {
      const inflation = calculateInflation(900, 1000)
      expect(inflation).toBe(-10)
    })

    it('returns 0 for no change', () => {
      const inflation = calculateInflation(1000, 1000)
      expect(inflation).toBe(0)
    })

    it('handles zero previous supply', () => {
      const inflation = calculateInflation(1000, 0)
      expect(inflation).toBe(0)
    })
  })

  describe('Velocity Calculation', () => {
    const calculateVelocity = (transactionVolume: number, averageSupply: number): number => {
      if (averageSupply === 0) return 0
      return transactionVolume / averageSupply
    }

    it('calculates correct velocity', () => {
      const velocity = calculateVelocity(5000, 1000)
      expect(velocity).toBe(5)
    })

    it('returns 0 for zero supply', () => {
      const velocity = calculateVelocity(5000, 0)
      expect(velocity).toBe(0)
    })

    it('returns low velocity for stagnant economy', () => {
      const velocity = calculateVelocity(100, 10000)
      expect(velocity).toBe(0.01)
    })
  })

  describe('HHI (Herfindahl-Hirschman Index) Calculation', () => {
    // HHI measures market concentration (0-10000, where 10000 = monopoly)
    const calculateHHI = (balances: number[]): number => {
      const total = balances.reduce((a, b) => a + b, 0)
      if (total === 0) return 0

      return balances.reduce((sum, balance) => {
        const marketShare = (balance / total) * 100
        return sum + marketShare * marketShare
      }, 0)
    }

    it('returns 10000 for monopoly (single holder)', () => {
      const hhi = calculateHHI([1000])
      expect(hhi).toBe(10000)
    })

    it('returns lower value for distributed wealth', () => {
      const balances = Array(100).fill(100)
      const hhi = calculateHHI(balances)
      expect(hhi).toBe(100) // 100 students each with 1% = 100 * 1^2 = 100
    })

    it('returns moderate value for uneven distribution', () => {
      const balances = [500, 300, 100, 50, 50]
      const hhi = calculateHHI(balances)
      expect(hhi).toBeGreaterThan(2000)
      expect(hhi).toBeLessThan(5000)
    })

    it('handles empty array', () => {
      const hhi = calculateHHI([])
      expect(hhi).toBe(0)
    })
  })
})

describe('Price Calculations', () => {
  describe('Dynamic Pricing', () => {
    const calculateDynamicPrice = (
      basePrice: number,
      demandFactor: number,
      inflationRate: number,
      scarcityFactor: number
    ): number => {
      const adjustedPrice = basePrice * demandFactor * (1 + inflationRate / 100) * scarcityFactor
      // Clamp between 60% and 160% of base
      const minPrice = basePrice * 0.6
      const maxPrice = basePrice * 1.6
      return Math.round(Math.max(minPrice, Math.min(maxPrice, adjustedPrice)))
    }

    it('returns base price for neutral conditions', () => {
      const price = calculateDynamicPrice(100, 1, 0, 1)
      expect(price).toBe(100)
    })

    it('increases price for high demand', () => {
      const price = calculateDynamicPrice(100, 1.3, 0, 1)
      expect(price).toBe(130)
    })

    it('decreases price for low demand', () => {
      const price = calculateDynamicPrice(100, 0.8, 0, 1)
      expect(price).toBe(80)
    })

    it('increases price for inflation', () => {
      const price = calculateDynamicPrice(100, 1, 10, 1)
      expect(price).toBe(110)
    })

    it('increases price for scarcity', () => {
      const price = calculateDynamicPrice(100, 1, 0, 1.2)
      expect(price).toBe(120)
    })

    it('clamps price at maximum', () => {
      const price = calculateDynamicPrice(100, 2, 50, 1.5)
      expect(price).toBe(160) // Clamped at 160% of base
    })

    it('clamps price at minimum', () => {
      const price = calculateDynamicPrice(100, 0.3, -20, 0.8)
      expect(price).toBe(60) // Clamped at 60% of base
    })
  })

  describe('Price Smoothing', () => {
    const smoothPrice = (currentPrice: number, targetPrice: number, smoothingFactor = 0.3): number => {
      return Math.round(currentPrice + (targetPrice - currentPrice) * smoothingFactor)
    }

    it('moves toward target price gradually', () => {
      const smoothed = smoothPrice(100, 150, 0.3)
      expect(smoothed).toBe(115) // 100 + (150-100) * 0.3 = 115
    })

    it('returns current price when already at target', () => {
      const smoothed = smoothPrice(100, 100, 0.3)
      expect(smoothed).toBe(100)
    })

    it('decreases price toward lower target', () => {
      const smoothed = smoothPrice(100, 70, 0.3)
      expect(smoothed).toBe(91) // 100 + (70-100) * 0.3 = 91
    })
  })
})

describe('Wallet Operations', () => {
  describe('Balance Validation', () => {
    const validateTransfer = (
      senderBalance: number,
      amount: number,
      maxTransferAmount: number | null
    ): { valid: boolean; error?: string } => {
      if (amount <= 0) {
        return { valid: false, error: 'Amount must be positive' }
      }
      if (amount > senderBalance) {
        return { valid: false, error: 'Insufficient balance' }
      }
      if (maxTransferAmount && amount > maxTransferAmount) {
        return { valid: false, error: `Maximum transfer is ${maxTransferAmount}` }
      }
      return { valid: true }
    }

    it('accepts valid transfer', () => {
      const result = validateTransfer(1000, 100, null)
      expect(result.valid).toBe(true)
    })

    it('rejects transfer exceeding balance', () => {
      const result = validateTransfer(50, 100, null)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient')
    })

    it('rejects transfer exceeding max limit', () => {
      const result = validateTransfer(1000, 600, 500)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Maximum')
    })

    it('rejects negative amount', () => {
      const result = validateTransfer(1000, -50, null)
      expect(result.valid).toBe(false)
    })

    it('rejects zero amount', () => {
      const result = validateTransfer(1000, 0, null)
      expect(result.valid).toBe(false)
    })
  })
})
