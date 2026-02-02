import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Get student from token
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const query = getQuery(event)
  const classroomId = query.classroom_id as string || session.classroom_id

  const client = createServerSupabaseClient(event)

  // Get student's wallet
  const { data: wallet } = await client
    .from('wallets')
    .select('id, balance')
    .eq('student_id', session.student_id)
    .eq('classroom_id', classroomId)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'Wallet no encontrada' })
  }

  // Get classroom data
  const { data: classroom } = await client
    .from('classrooms')
    .select('currency_name, currency_symbol, treasury_total, treasury_remaining')
    .eq('id', classroomId)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 404, message: 'Aula no encontrada' })
  }

  // Get all wallets for comparison
  const { data: allWallets } = await client
    .from('wallets')
    .select('balance')
    .eq('classroom_id', classroomId)
    .order('balance', { ascending: false })

  const allBalances = (allWallets || []).map(w => w.balance)
  const totalStudents = allBalances.length
  const myBalance = wallet.balance
  const circulatingSupply = allBalances.reduce((sum, b) => sum + b, 0)
  const avgBalance = circulatingSupply / totalStudents

  // Calculate rank and percentile
  const sortedBalances = [...allBalances].sort((a, b) => b - a)
  const myRank = sortedBalances.findIndex(b => b <= myBalance) + 1
  const myPercentile = ((totalStudents - myRank + 1) / totalStudents) * 100

  // Wealth share
  const myWealthShare = circulatingSupply > 0 ? (myBalance / circulatingSupply) * 100 : 0

  // Time periods
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get my transactions (all time)
  const { data: allMyTransactions } = await client
    .from('transactions')
    .select('amount, type, reason, created_at, from_wallet_id, to_wallet_id')
    .eq('classroom_id', classroomId)
    .or(`from_wallet_id.eq.${wallet.id},to_wallet_id.eq.${wallet.id}`)
    .order('created_at', { ascending: false })

  // Get recent transactions (last 7 days)
  const recentTransactions = (allMyTransactions || []).filter(
    t => new Date(t.created_at) >= sevenDaysAgo
  )

  // Get monthly transactions
  const monthlyTransactions = (allMyTransactions || []).filter(
    t => new Date(t.created_at) >= thirtyDaysAgo
  )

  // === INCOME ANALYSIS ===
  const weeklyIncome = recentTransactions
    .filter(t => t.to_wallet_id === wallet.id)
    .reduce((sum, t) => sum + t.amount, 0)

  const monthlyIncome = monthlyTransactions
    .filter(t => t.to_wallet_id === wallet.id)
    .reduce((sum, t) => sum + t.amount, 0)

  // Income by source
  const incomeBySource = {
    emissions: 0,
    transfers: 0,
    refunds: 0,
    other: 0,
  }

  for (const tx of monthlyTransactions.filter(t => t.to_wallet_id === wallet.id)) {
    if (tx.type === 'EMISSION') incomeBySource.emissions += tx.amount
    else if (tx.type === 'TRANSFER') incomeBySource.transfers += tx.amount
    else if (tx.type === 'REFUND') incomeBySource.refunds += tx.amount
    else incomeBySource.other += tx.amount
  }

  // === SPENDING ANALYSIS ===
  const weeklySpending = recentTransactions
    .filter(t => t.from_wallet_id === wallet.id)
    .reduce((sum, t) => sum + t.amount, 0)

  const monthlySpending = monthlyTransactions
    .filter(t => t.from_wallet_id === wallet.id)
    .reduce((sum, t) => sum + t.amount, 0)

  // Spending by category
  const spendingByCategory = {
    purchases: 0,
    transfers: 0,
    other: 0,
  }

  for (const tx of monthlyTransactions.filter(t => t.from_wallet_id === wallet.id)) {
    if (tx.type === 'PURCHASE') spendingByCategory.purchases += tx.amount
    else if (tx.type === 'TRANSFER') spendingByCategory.transfers += tx.amount
    else spendingByCategory.other += tx.amount
  }

  // === FINANCIAL RATIOS ===
  // Savings rate: (income - spending) / income
  const netFlow = monthlyIncome - monthlySpending
  const savingsRate = monthlyIncome > 0 ? (netFlow / monthlyIncome) * 100 : 0

  // Burn rate: spending / balance (how fast depleting savings)
  const burnRate = myBalance > 0 ? (weeklySpending / myBalance) * 100 : 0

  // Runway: at current spending rate, weeks until zero
  const weeklyAvgSpending = monthlySpending / 4
  const runway = weeklyAvgSpending > 0 ? myBalance / weeklyAvgSpending : Infinity

  // === ACTIVITY METRICS ===
  const weeklyTxCount = recentTransactions.length
  const monthlyTxCount = monthlyTransactions.length
  const totalTxCount = allMyTransactions?.length || 0

  // Transaction frequency (per week)
  const daysActive = Math.max(1, Math.ceil((now.getTime() - new Date((allMyTransactions || [])[allMyTransactions!.length - 1]?.created_at || now).getTime()) / (1000 * 60 * 60 * 24 * 7)))
  const avgTxPerWeek = totalTxCount / Math.max(1, daysActive)

  // === PURCHASING POWER ===
  const { data: marketItems } = await client
    .from('market_items')
    .select('base_price, current_price, name')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('current_price', { ascending: true })

  const avgItemPrice = marketItems?.length
    ? marketItems.reduce((sum, i) => sum + i.current_price, 0) / marketItems.length
    : 0

  const itemsICanAfford = (marketItems || []).filter(i => i.current_price <= myBalance).length
  const totalItems = marketItems?.length || 0
  const affordabilityRate = totalItems > 0 ? (itemsICanAfford / totalItems) * 100 : 100

  const purchasingPower = avgItemPrice > 0 ? myBalance / avgItemPrice : 0
  const cheapestItem = marketItems?.[0]
  const mostExpensiveAffordable = (marketItems || [])
    .filter(i => i.current_price <= myBalance)
    .pop()

  // === COMPARISON TO PEERS ===
  const medianBalance = allBalances.length > 0
    ? [...allBalances].sort((a, b) => a - b)[Math.floor(allBalances.length / 2)]
    : 0

  const vsMedian = medianBalance > 0 ? ((myBalance - medianBalance) / medianBalance) * 100 : 0
  const vsAverage = avgBalance > 0 ? ((myBalance - avgBalance) / avgBalance) * 100 : 0

  // === STREAKS ===
  const { data: streaks } = await client
    .from('student_streaks')
    .select('streak_type, current_streak, best_streak, total_count')
    .eq('student_id', session.student_id)
    .eq('classroom_id', classroomId)

  const activeStreaks = (streaks || []).filter(s => s.current_streak > 0)
  const totalStreakDays = activeStreaks.reduce((sum, s) => sum + s.current_streak, 0)
  const bestEverStreak = Math.max(0, ...((streaks || []).map(s => s.best_streak)))

  // === BUILD RESPONSE ===
  const indicators = {
    // Position
    position: {
      balance: myBalance,
      rank: myRank,
      total_students: totalStudents,
      percentile: myPercentile.toFixed(1),
      wealth_share: myWealthShare.toFixed(2),
      vs_median: vsMedian.toFixed(1),
      vs_average: vsAverage.toFixed(1),
      education: {
        title: 'Tu Posición Económica',
        explanation: 'Dónde te ubicas comparado con tus compañeros.',
        interpretation: myPercentile >= 75
          ? '🏆 Estás en el top 25%. Tienes más riqueza que la mayoría.'
          : myPercentile >= 50
            ? '✅ Estás por encima de la mediana. Vas bien.'
            : myPercentile >= 25
              ? '⚠️ Estás por debajo de la mediana. Considera ahorrar más o participar más.'
              : '📉 Estás en el cuartil más bajo. Participa en clase para ganar más monedas.',
      },
    },

    // Income
    income: {
      weekly: weeklyIncome,
      monthly: monthlyIncome,
      by_source: incomeBySource,
      primary_source: Object.entries(incomeBySource)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'ninguna',
      education: {
        title: 'Tus Ingresos',
        explanation: 'De dónde viene tu dinero.',
        interpretation: incomeBySource.emissions > incomeBySource.transfers
          ? '💪 La mayoría de tus ingresos vienen del docente. Sigue participando.'
          : '🤝 Recibes muchas transferencias de compañeros. Buenas relaciones comerciales.',
      },
    },

    // Spending
    spending: {
      weekly: weeklySpending,
      monthly: monthlySpending,
      by_category: spendingByCategory,
      biggest_expense: Object.entries(spendingByCategory)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'ninguno',
      education: {
        title: 'Tus Gastos',
        explanation: 'En qué gastas tu dinero.',
        interpretation: spendingByCategory.purchases > spendingByCategory.transfers
          ? '🛒 Gastas principalmente en el mercado. Disfruta los beneficios.'
          : '💸 Transfieres mucho a otros. Generoso o inversionista.',
      },
    },

    // Financial health
    financial_health: {
      net_flow_monthly: netFlow,
      savings_rate: savingsRate.toFixed(1),
      burn_rate: burnRate.toFixed(1),
      runway_weeks: runway === Infinity ? '∞' : runway.toFixed(1),
      status: savingsRate > 20 ? 'saver' : savingsRate > 0 ? 'balanced' : 'spender',
      education: {
        title: 'Salud Financiera',
        explanation: 'Tu balance entre ingresos y gastos.',
        metrics: [
          { name: 'Flujo Neto', value: netFlow >= 0 ? '+' + netFlow : netFlow, desc: 'Ingresos - Gastos este mes' },
          { name: 'Tasa de Ahorro', value: savingsRate.toFixed(0) + '%', desc: 'Del ingreso que ahorras' },
          { name: 'Tasa de Quema', value: burnRate.toFixed(0) + '%', desc: 'Del balance gastado por semana' },
          { name: 'Autonomía', value: runway === Infinity ? '∞' : runway.toFixed(1) + ' sem', desc: 'Semanas de gasto con balance actual' },
        ],
        interpretation: savingsRate > 30
          ? '💰 Excelente ahorrador. Tienes buen colchón financiero.'
          : savingsRate > 10
            ? '✅ Balance saludable. Ahorras un poco cada período.'
            : savingsRate > 0
              ? '⚠️ Gastas casi todo. Considera guardar más.'
              : '🔴 Gastas más de lo que ganas. Cuidado con el balance.',
      },
    },

    // Activity
    activity: {
      weekly_transactions: weeklyTxCount,
      monthly_transactions: monthlyTxCount,
      total_transactions: totalTxCount,
      avg_per_week: avgTxPerWeek.toFixed(1),
      active_streaks: activeStreaks.length,
      total_streak_days: totalStreakDays,
      best_streak: bestEverStreak,
      education: {
        title: 'Tu Actividad',
        explanation: 'Qué tan activo eres en la economía.',
        interpretation: weeklyTxCount > 5
          ? '🔥 Muy activo. Participas mucho en la economía del aula.'
          : weeklyTxCount > 2
            ? '✅ Activo. Usas tu dinero regularmente.'
            : weeklyTxCount > 0
              ? '😴 Poco activo. Hay oportunidades que podrías aprovechar.'
              : '⏸️ Sin actividad reciente. ¿Estás ahorrando?',
      },
    },

    // Purchasing power
    purchasing_power: {
      items_affordable: itemsICanAfford,
      total_items: totalItems,
      affordability_rate: affordabilityRate.toFixed(1),
      purchasing_power_index: purchasingPower.toFixed(2),
      cheapest_item: cheapestItem ? { name: cheapestItem.name, price: cheapestItem.current_price } : null,
      best_affordable: mostExpensiveAffordable ? { name: mostExpensiveAffordable.name, price: mostExpensiveAffordable.current_price } : null,
      education: {
        title: 'Poder de Compra',
        explanation: 'Qué puedes permitirte comprar.',
        interpretation: affordabilityRate >= 80
          ? '🛍️ Puedes comprar casi todo. Tienes buen poder adquisitivo.'
          : affordabilityRate >= 50
            ? '✅ Puedes comprar la mitad de los productos. Opciones razonables.'
            : affordabilityRate >= 25
              ? '⚠️ Opciones limitadas. Ahorra para productos más caros.'
              : '💸 Muy poco alcance. Necesitas más monedas.',
      },
    },

    // Summary
    summary: {
      currency_symbol: classroom.currency_symbol,
      currency_name: classroom.currency_name,
      overall_status: calculateStudentStatus(myPercentile, savingsRate, weeklyTxCount),
    },
  }

  return { data: indicators }
})

function calculateStudentStatus(percentile: number, savingsRate: number, weeklyTx: number): { label: string; emoji: string; color: string } {
  // Determine archetype based on behavior
  if (percentile >= 75 && savingsRate > 20) {
    return { label: 'Magnate', emoji: '🏆', color: 'yellow' }
  }
  if (savingsRate > 30 && weeklyTx < 3) {
    return { label: 'Ahorrador', emoji: '💰', color: 'green' }
  }
  if (weeklyTx >= 5 && savingsRate < 10) {
    return { label: 'Activo', emoji: '⚡', color: 'blue' }
  }
  if (percentile < 25 && savingsRate < 0) {
    return { label: 'En riesgo', emoji: '⚠️', color: 'red' }
  }
  if (percentile >= 50) {
    return { label: 'Estable', emoji: '✅', color: 'green' }
  }
  return { label: 'En desarrollo', emoji: '📈', color: 'blue' }
}
