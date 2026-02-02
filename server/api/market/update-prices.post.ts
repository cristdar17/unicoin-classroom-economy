import { serverSupabaseClient } from '#supabase/server'
import {
  calculateDynamicPrice,
  calculateDemandScore,
  calculateScarcityScore,
  calculateInflationRate,
  calculateVelocity,
  calculateTimeFactor,
} from '~/server/utils/economy'

// Recalculate all prices for a classroom based on economic factors
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { classroom_id } = body

  if (!classroom_id) {
    throw createError({ statusCode: 400, message: 'classroom_id required' })
  }

  const client = await serverSupabaseClient(event)

  // Get classroom settings
  const { data: classroom } = await client
    .from('classrooms')
    .select('*, settings')
    .eq('id', classroom_id)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 404, message: 'Classroom not found' })
  }

  // Get all market items
  const { data: items } = await client
    .from('market_items')
    .select('*')
    .eq('classroom_id', classroom_id)
    .eq('is_active', true)

  if (!items?.length) {
    return { data: { updated: 0 } }
  }

  // Get economic data
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  // Get transactions for velocity and inflation
  const { data: recentTransactions } = await client
    .from('transactions')
    .select('amount, type, created_at')
    .eq('classroom_id', classroom_id)
    .gte('created_at', sevenDaysAgo.toISOString())

  const { data: olderTransactions } = await client
    .from('transactions')
    .select('amount, type')
    .eq('classroom_id', classroom_id)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .lt('created_at', sevenDaysAgo.toISOString())

  // Get current supply (sum of all wallet balances)
  const { data: wallets } = await client
    .from('wallets')
    .select('balance')
    .eq('classroom_id', classroom_id)

  const currentSupply = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0

  // Estimate previous supply (current - emissions + purchases in last 7 days)
  const recentEmissions = (recentTransactions || [])
    .filter(t => t.type === 'EMISSION')
    .reduce((sum, t) => sum + t.amount, 0)

  const recentPurchases = (recentTransactions || [])
    .filter(t => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + t.amount, 0)

  const previousSupply = currentSupply - recentEmissions + recentPurchases

  // Calculate global factors
  const inflationRate = calculateInflationRate(currentSupply, previousSupply, 7)
  const transactionVolume = (recentTransactions || []).reduce((sum, t) => sum + t.amount, 0)
  const velocity = calculateVelocity(transactionVolume, (currentSupply + previousSupply) / 2)
  const velocityFactor = Math.min(velocity, 2) // Cap at 2
  const timeFactor = calculateTimeFactor(classroom.settings?.semester_end_date || null)

  // Get purchase counts per item
  const { data: purchaseCounts } = await client
    .from('transactions')
    .select('reason')
    .eq('classroom_id', classroom_id)
    .eq('type', 'PURCHASE')
    .gte('created_at', sevenDaysAgo.toISOString())

  // Count purchases per item name
  const purchasesByItem: Record<string, number> = {}
  for (const tx of purchaseCounts || []) {
    const match = tx.reason?.match(/Compra: (.+)/)
    if (match) {
      const itemName = match[1]
      purchasesByItem[itemName] = (purchasesByItem[itemName] || 0) + 1
    }
  }

  // Calculate average purchases per item
  const totalPurchases = Object.values(purchasesByItem).reduce((a, b) => a + b, 0)
  const avgPurchasesPerItem = items.length > 0 ? totalPurchases / items.length : 1

  // Update each item's price
  const updates = []

  for (const item of items) {
    const itemPurchases = purchasesByItem[item.name] || 0
    const demandScore = calculateDemandScore(itemPurchases, avgPurchasesPerItem)
    const scarcityScore = calculateScarcityScore(item.stock, item.stock) // Using current as initial for now

    const newPrice = calculateDynamicPrice({
      basePrice: item.base_price,
      demandScore,
      scarcityScore,
      inflationRate,
      velocityFactor,
      timeFactor,
    })

    // Only update if price changed significantly (> 2%)
    const priceChange = Math.abs(newPrice - item.current_price) / item.current_price
    if (priceChange > 0.02) {
      updates.push({
        id: item.id,
        previous_price: item.current_price,
        current_price: newPrice,
      })
    }
  }

  // Apply updates
  for (const update of updates) {
    await client
      .from('market_items')
      .update({
        current_price: update.current_price,
      })
      .eq('id', update.id)
  }

  // Store economic snapshot
  await client.from('economic_snapshots').insert({
    classroom_id,
    total_supply: currentSupply,
    velocity,
    inflation_rate: inflationRate,
    gini_index: 0, // Would need to calculate from wallet balances
  })

  return {
    data: {
      updated: updates.length,
      inflationRate: (inflationRate * 100).toFixed(2) + '%',
      velocity: velocity.toFixed(2),
      timeFactor,
    },
  }
})
