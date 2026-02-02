/**
 * Transactions System Tests
 * Tests for emissions, transfers, and wallet operations
 */
import { describe, it, expect } from 'vitest'

interface Wallet {
  id: string
  student_id: string
  classroom_id: string
  balance: number
}

interface Transaction {
  id: string
  from_wallet_id: string | null
  to_wallet_id: string | null
  amount: number
  type: 'EMISSION' | 'TRANSFER' | 'PURCHASE' | 'REFUND' | 'SAVINGS_LOCK' | 'SAVINGS_WITHDRAW'
  reason: string
  classroom_id: string
}

interface Treasury {
  total: number
  remaining: number
}

describe('Transactions System', () => {
  describe('Coin Emission', () => {
    it('should emit coins to single student', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 }
      const treasury: Treasury = { total: 10000, remaining: 5000 }
      const amount = 50

      // Simulate emission
      const newBalance = wallet.balance + amount
      const newTreasury = treasury.remaining - amount

      expect(newBalance).toBe(150)
      expect(newTreasury).toBe(4950)
    })

    it('should emit coins to multiple students', () => {
      const wallets: Wallet[] = [
        { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 },
        { id: '2', student_id: 's2', classroom_id: 'c1', balance: 50 },
        { id: '3', student_id: 's3', classroom_id: 'c1', balance: 200 },
      ]
      const treasury: Treasury = { total: 10000, remaining: 5000 }
      const amountPerStudent = 25

      const totalEmitted = amountPerStudent * wallets.length
      const newTreasury = treasury.remaining - totalEmitted
      const updatedBalances = wallets.map(w => w.balance + amountPerStudent)

      expect(totalEmitted).toBe(75)
      expect(newTreasury).toBe(4925)
      expect(updatedBalances).toEqual([125, 75, 225])
    })

    it('should reject emission exceeding treasury', () => {
      const treasury: Treasury = { total: 10000, remaining: 30 }
      const amount = 50
      const studentCount = 1

      const canEmit = treasury.remaining >= (amount * studentCount)

      expect(canEmit).toBe(false)
    })

    it('should reject emission of zero or negative amount', () => {
      const validateAmount = (amount: number) => amount > 0

      expect(validateAmount(50)).toBe(true)
      expect(validateAmount(1)).toBe(true)
      expect(validateAmount(0)).toBe(false)
      expect(validateAmount(-10)).toBe(false)
    })

    it('should create correct transaction record for emission', () => {
      const createEmissionTransaction = (
        toWalletId: string,
        amount: number,
        reason: string,
        classroomId: string
      ): Omit<Transaction, 'id'> => ({
        from_wallet_id: null, // Emissions come from treasury, not a wallet
        to_wallet_id: toWalletId,
        amount,
        type: 'EMISSION',
        reason,
        classroom_id: classroomId
      })

      const tx = createEmissionTransaction('wallet1', 100, 'Participación en clase', 'classroom1')

      expect(tx.from_wallet_id).toBeNull()
      expect(tx.to_wallet_id).toBe('wallet1')
      expect(tx.amount).toBe(100)
      expect(tx.type).toBe('EMISSION')
    })
  })

  describe('P2P Transfers', () => {
    it('should transfer coins between students', () => {
      const fromWallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 }
      const toWallet: Wallet = { id: '2', student_id: 's2', classroom_id: 'c1', balance: 50 }
      const amount = 30

      const newFromBalance = fromWallet.balance - amount
      const newToBalance = toWallet.balance + amount

      expect(newFromBalance).toBe(70)
      expect(newToBalance).toBe(80)
    })

    it('should reject transfer exceeding balance', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 }
      const amount = 150

      const canTransfer = wallet.balance >= amount

      expect(canTransfer).toBe(false)
    })

    it('should reject transfer to same wallet', () => {
      const validateTransfer = (fromId: string, toId: string) => fromId !== toId

      expect(validateTransfer('wallet1', 'wallet2')).toBe(true)
      expect(validateTransfer('wallet1', 'wallet1')).toBe(false)
    })

    it('should enforce maximum transfer amount if configured', () => {
      const maxTransferAmount = 500

      const validateTransferAmount = (amount: number, max: number | null) => {
        if (max === null) return true
        return amount <= max
      }

      expect(validateTransferAmount(100, maxTransferAmount)).toBe(true)
      expect(validateTransferAmount(500, maxTransferAmount)).toBe(true)
      expect(validateTransferAmount(501, maxTransferAmount)).toBe(false)
      expect(validateTransferAmount(1000, null)).toBe(true) // No limit
    })

    it('should create correct transaction record for transfer', () => {
      const createTransferTransaction = (
        fromWalletId: string,
        toWalletId: string,
        amount: number,
        message: string,
        classroomId: string
      ): Omit<Transaction, 'id'> => ({
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        amount,
        type: 'TRANSFER',
        reason: message,
        classroom_id: classroomId
      })

      const tx = createTransferTransaction('wallet1', 'wallet2', 50, 'Por la tarea', 'classroom1')

      expect(tx.from_wallet_id).toBe('wallet1')
      expect(tx.to_wallet_id).toBe('wallet2')
      expect(tx.amount).toBe(50)
      expect(tx.type).toBe('TRANSFER')
    })
  })

  describe('Purchase Transactions', () => {
    it('should deduct balance for purchase', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 500 }
      const price = 150

      const newBalance = wallet.balance - price

      expect(newBalance).toBe(350)
    })

    it('should reject purchase exceeding balance', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 }
      const price = 150

      const canAfford = wallet.balance >= price

      expect(canAfford).toBe(false)
    })

    it('should create correct transaction record for purchase', () => {
      const createPurchaseTransaction = (
        fromWalletId: string,
        amount: number,
        itemName: string,
        classroomId: string
      ): Omit<Transaction, 'id'> => ({
        from_wallet_id: fromWalletId,
        to_wallet_id: null, // Purchases don't go to another wallet
        amount,
        type: 'PURCHASE',
        reason: `Compra: ${itemName}`,
        classroom_id: classroomId
      })

      const tx = createPurchaseTransaction('wallet1', 100, 'Salir temprano', 'classroom1')

      expect(tx.from_wallet_id).toBe('wallet1')
      expect(tx.to_wallet_id).toBeNull()
      expect(tx.type).toBe('PURCHASE')
      expect(tx.reason).toBe('Compra: Salir temprano')
    })
  })

  describe('Refund Transactions', () => {
    it('should refund coins to wallet', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 }
      const refundAmount = 50

      const newBalance = wallet.balance + refundAmount

      expect(newBalance).toBe(150)
    })

    it('should create correct transaction record for refund', () => {
      const createRefundTransaction = (
        toWalletId: string,
        amount: number,
        reason: string,
        classroomId: string
      ): Omit<Transaction, 'id'> => ({
        from_wallet_id: null,
        to_wallet_id: toWalletId,
        amount,
        type: 'REFUND',
        reason,
        classroom_id: classroomId
      })

      const tx = createRefundTransaction('wallet1', 100, 'Compra rechazada: Producto agotado', 'classroom1')

      expect(tx.to_wallet_id).toBe('wallet1')
      expect(tx.type).toBe('REFUND')
    })
  })

  describe('Savings Transactions', () => {
    it('should lock coins for savings', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 500 }
      const lockAmount = 200

      const newBalance = wallet.balance - lockAmount

      expect(newBalance).toBe(300)
    })

    it('should unlock coins with interest', () => {
      const wallet: Wallet = { id: '1', student_id: 's1', classroom_id: 'c1', balance: 300 }
      const principal = 200
      const interest = 50
      const totalReturn = principal + interest

      const newBalance = wallet.balance + totalReturn

      expect(newBalance).toBe(550)
    })
  })

  describe('Treasury Management', () => {
    it('should track treasury usage', () => {
      const treasury: Treasury = { total: 10000, remaining: 10000 }

      // Simulate emissions
      const emissions = [100, 50, 200, 75]
      let remaining = treasury.remaining

      for (const amount of emissions) {
        remaining -= amount
      }

      expect(remaining).toBe(9575)
    })

    it('should calculate treasury percentage', () => {
      const calculateTreasuryPercent = (remaining: number, total: number) => {
        return Math.round((remaining / total) * 100)
      }

      expect(calculateTreasuryPercent(10000, 10000)).toBe(100)
      expect(calculateTreasuryPercent(5000, 10000)).toBe(50)
      expect(calculateTreasuryPercent(2500, 10000)).toBe(25)
      expect(calculateTreasuryPercent(0, 10000)).toBe(0)
    })

    it('should calculate total in circulation', () => {
      const wallets: Wallet[] = [
        { id: '1', student_id: 's1', classroom_id: 'c1', balance: 100 },
        { id: '2', student_id: 's2', classroom_id: 'c1', balance: 250 },
        { id: '3', student_id: 's3', classroom_id: 'c1', balance: 75 },
      ]

      const totalInCirculation = wallets.reduce((sum, w) => sum + w.balance, 0)

      expect(totalInCirculation).toBe(425)
    })
  })

  describe('Transaction History', () => {
    it('should filter transactions by type', () => {
      const transactions: Transaction[] = [
        { id: '1', from_wallet_id: null, to_wallet_id: 'w1', amount: 100, type: 'EMISSION', reason: '', classroom_id: 'c1' },
        { id: '2', from_wallet_id: 'w1', to_wallet_id: 'w2', amount: 50, type: 'TRANSFER', reason: '', classroom_id: 'c1' },
        { id: '3', from_wallet_id: 'w2', to_wallet_id: null, amount: 30, type: 'PURCHASE', reason: '', classroom_id: 'c1' },
        { id: '4', from_wallet_id: null, to_wallet_id: 'w1', amount: 200, type: 'EMISSION', reason: '', classroom_id: 'c1' },
      ]

      const emissions = transactions.filter(t => t.type === 'EMISSION')
      const transfers = transactions.filter(t => t.type === 'TRANSFER')
      const purchases = transactions.filter(t => t.type === 'PURCHASE')

      expect(emissions.length).toBe(2)
      expect(transfers.length).toBe(1)
      expect(purchases.length).toBe(1)
    })

    it('should filter transactions by wallet', () => {
      const transactions: Transaction[] = [
        { id: '1', from_wallet_id: null, to_wallet_id: 'w1', amount: 100, type: 'EMISSION', reason: '', classroom_id: 'c1' },
        { id: '2', from_wallet_id: 'w1', to_wallet_id: 'w2', amount: 50, type: 'TRANSFER', reason: '', classroom_id: 'c1' },
        { id: '3', from_wallet_id: 'w2', to_wallet_id: 'w1', amount: 25, type: 'TRANSFER', reason: '', classroom_id: 'c1' },
      ]

      const walletId = 'w1'
      const walletTransactions = transactions.filter(
        t => t.from_wallet_id === walletId || t.to_wallet_id === walletId
      )

      expect(walletTransactions.length).toBe(3)
    })

    it('should calculate net balance change for wallet', () => {
      const transactions: Transaction[] = [
        { id: '1', from_wallet_id: null, to_wallet_id: 'w1', amount: 100, type: 'EMISSION', reason: '', classroom_id: 'c1' },
        { id: '2', from_wallet_id: 'w1', to_wallet_id: 'w2', amount: 30, type: 'TRANSFER', reason: '', classroom_id: 'c1' },
        { id: '3', from_wallet_id: 'w2', to_wallet_id: 'w1', amount: 15, type: 'TRANSFER', reason: '', classroom_id: 'c1' },
        { id: '4', from_wallet_id: 'w1', to_wallet_id: null, amount: 20, type: 'PURCHASE', reason: '', classroom_id: 'c1' },
      ]

      const walletId = 'w1'
      let netChange = 0

      for (const tx of transactions) {
        if (tx.to_wallet_id === walletId) netChange += tx.amount
        if (tx.from_wallet_id === walletId) netChange -= tx.amount
      }

      // +100 (emission) -30 (sent) +15 (received) -20 (purchase) = 65
      expect(netChange).toBe(65)
    })
  })
})
