import { createServerSupabaseClient } from '~/server/utils/supabase'

// This endpoint is called by Vercel Cron at 12:01 AM daily
// Configure in vercel.json

// Price algorithm based on economic principles:
// 1. Supply-side: More emissions = gradual inflation pressure
// 2. Demand-side: More purchases/requests = price increase
// 3. Scarcity: Low stock = price increase
// 4. Mean reversion: Prices tend to return to base over time
// 5. Purchasing power: Prices consider average wallet balance
// 6. Smoothing: Changes are gradual to avoid volatility

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const client = createServerSupabaseClient(event)

  const { data: classrooms, error: classroomError } = await client
    .from('classrooms')
    .select('id, settings, treasury_total, treasury_remaining')

  if (classroomError || !classrooms) {
    console.error('Error fetching classrooms:', classroomError)
    return { data: { success: false, error: 'Error fetching classrooms' } }
  }

  let updatedItems = 0
  let processedClassrooms = 0

  for (const classroom of classrooms) {
    try {
      const { data: items, error: itemsError } = await client
        .from('market_items')
        .select('*')
        .eq('classroom_id', classroom.id)
        .eq('is_active', true)

      if (itemsError || !items || items.length === 0) continue

      // Get transactions from multiple time windows for better analysis
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // Recent purchases (last 7 days)
      const { data: recentPurchases } = await client
        .from('transactions')
        .select('reason, amount, created_at')
        .eq('classroom_id', classroom.id)
        .eq('type', 'PURCHASE')
        .gte('created_at', sevenDaysAgo.toISOString())

      // Older purchases (7-14 days ago) for trend comparison
      const { data: olderPurchases } = await client
        .from('transactions')
        .select('reason, amount')
        .eq('classroom_id', classroom.id)
        .eq('type', 'PURCHASE')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())

      // Count purchases per item
      const countPurchases = (purchases: any[]) => {
        const counts: Record<string, number> = {}
        for (const purchase of purchases || []) {
          const match = purchase.reason?.match(/^Compra: ([^|]+)/)
          if (match) {
            const itemName = match[1].trim()
            counts[itemName] = (counts[itemName] || 0) + 1
          }
        }
        return counts
      }

      const recentCounts = countPurchases(recentPurchases || [])
      const olderCounts = countPurchases(olderPurchases || [])

      // Pending purchase requests
      const { data: pendingRequests } = await client
        .from('purchase_requests')
        .select('item_name')
        .eq('classroom_id', classroom.id)
        .eq('status', 'PENDING')

      const pendingCounts: Record<string, number> = {}
      for (const req of pendingRequests || []) {
        pendingCounts[req.item_name] = (pendingCounts[req.item_name] || 0) + 1
      }

      // Get wallet data for purchasing power analysis
      const { data: wallets } = await client
        .from('wallets')
        .select('balance')
        .eq('classroom_id', classroom.id)

      const balances = (wallets || []).map(w => w.balance)
      const totalStudents = balances.length
      const circulatingSupply = balances.reduce((sum, b) => sum + b, 0)
      const avgBalance = totalStudents > 0 ? circulatingSupply / totalStudents : 0
      const medianBalance = totalStudents > 0
        ? [...balances].sort((a, b) => a - b)[Math.floor(totalStudents / 2)]
        : 0

      // Calculate monetary base metrics
      const treasuryTotal = classroom.treasury_total || 10000
      const treasuryRemaining = classroom.treasury_remaining || treasuryTotal
      const emittedSupply = treasuryTotal - treasuryRemaining
      const emissionRate = emittedSupply / treasuryTotal // 0 to 1

      // Inflation factor based on emission rate (gentle curve)
      // At 50% emission: ~2% inflation factor
      // At 80% emission: ~5% inflation factor
      // At 100% emission: ~10% inflation factor
      // Uses logistic function for smooth transition
      const inflationFactor = 1 + (0.1 / (1 + Math.exp(-8 * (emissionRate - 0.7))))

      // Calculate total market metrics
      const avgItemPrice = items.reduce((sum, i) => sum + i.base_price, 0) / items.length
      const totalPendingDemand = Object.values(pendingCounts).reduce((sum, c) => sum + c, 0)

      // Purchasing power index: how many average items can average student buy?
      const purchasingPower = avgItemPrice > 0 ? avgBalance / avgItemPrice : 1

      // Adjust prices based on purchasing power (prevent unaffordable prices)
      // If avg student can buy < 2 items, reduce price pressure
      // If avg student can buy > 10 items, allow price increases
      const affordabilityFactor = purchasingPower < 2
        ? 0.95 - (2 - purchasingPower) * 0.05 // Reduce prices if unaffordable
        : purchasingPower > 10
          ? 1.02 // Slight increase if very affordable
          : 1.0

      // Update each item's price
      for (const item of items) {
        const recentPurchaseCount = recentCounts[item.name] || 0
        const olderPurchaseCount = olderCounts[item.name] || 0
        const pendingCount = pendingCounts[item.name] || 0

        // Demand trend: comparing recent to older period
        const demandTrend = olderPurchaseCount > 0
          ? recentPurchaseCount / olderPurchaseCount
          : recentPurchaseCount > 0 ? 1.2 : 1.0

        // Base demand factor (normalized by expected purchases)
        const expectedWeeklyPurchases = Math.max(1, totalStudents * 0.1) // 10% of students per week
        const demandRatio = recentPurchaseCount / expectedWeeklyPurchases

        // Demand score: smooth curve from 0.9 to 1.3
        // demandRatio = 0: 0.9 (low demand, slight price decrease)
        // demandRatio = 1: 1.0 (normal demand)
        // demandRatio = 2+: 1.2-1.3 (high demand)
        const demandScore = 0.9 + 0.4 * (1 - Math.exp(-demandRatio))

        // Pending requests add gentle demand pressure (max 15% increase)
        const pendingFactor = 1 + Math.min(0.15, pendingCount * 0.03)

        // Trend momentum (if demand is growing, add slight pressure)
        const trendFactor = demandTrend > 1.5 ? 1.05 : demandTrend < 0.5 ? 0.95 : 1.0

        // Scarcity factor (more conservative)
        let scarcityFactor = 1.0
        if (item.stock !== null && item.stock >= 0) {
          if (item.stock === 0) scarcityFactor = 1.2 // Out of stock
          else if (item.stock <= 2) scarcityFactor = 1.1
          else if (item.stock <= 5) scarcityFactor = 1.05
        }

        // Mean reversion: prices tend to return to base price over time
        // The further from base, the stronger the pull back
        const currentRatio = item.current_price / item.base_price
        const meanReversionFactor = currentRatio > 1.5
          ? 0.98 // Strong pull back if too high
          : currentRatio < 0.7
            ? 1.02 // Pull up if too low
            : 1.0

        // Random market noise (very small: -2% to +2%)
        const noiseFactor = 0.98 + Math.random() * 0.04

        // Calculate target price
        let targetPrice = item.base_price
          * demandScore
          * pendingFactor
          * trendFactor
          * scarcityFactor
          * inflationFactor
          * affordabilityFactor
          * meanReversionFactor
          * noiseFactor

        // Clamp between 60% and 160% of base price (less extreme than before)
        const minPrice = Math.round(item.base_price * 0.6)
        const maxPrice = Math.round(item.base_price * 1.6)
        targetPrice = Math.max(minPrice, Math.min(maxPrice, targetPrice))

        // Smooth transition: only move 30% toward target price
        // This prevents sudden jumps and creates natural price evolution
        const smoothingFactor = 0.3
        let newPrice = Math.round(
          item.current_price + (targetPrice - item.current_price) * smoothingFactor
        )

        // Ensure price is at least 1
        newPrice = Math.max(1, newPrice)

        // Only update if price changed by at least 3%
        const priceChange = Math.abs(newPrice - item.current_price) / item.current_price
        if (priceChange >= 0.03 && newPrice !== item.current_price) {
          await client
            .from('market_items')
            .update({
              current_price: newPrice,
              price_updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)

          updatedItems++
        }
      }

      // Save economic snapshot for historical analysis
      const today = new Date().toISOString().split('T')[0]
      await client.from('economic_indicators').upsert({
        classroom_id: classroom.id,
        snapshot_date: today,
        total_supply: treasuryTotal,
        circulating_supply: circulatingSupply,
        treasury_remaining: treasuryRemaining,
        avg_balance: Math.round(avgBalance),
        median_balance: Math.round(medianBalance),
        demand_index: 100 + (totalPendingDemand * 10),
        pending_purchases: totalPendingDemand,
      }, { onConflict: 'classroom_id,snapshot_date' }).catch(() => {})

      await client
        .from('classrooms')
        .update({ last_price_update: new Date().toISOString() })
        .eq('id', classroom.id)

      processedClassrooms++
    } catch (e) {
      console.error(`Error processing classroom ${classroom.id}:`, e)
    }
  }

  return {
    data: {
      success: true,
      processed_classrooms: processedClassrooms,
      updated_items: updatedItems,
      timestamp: new Date().toISOString(),
    },
  }
})
