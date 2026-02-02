import { createServerSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const classroomId = getRouterParam(event, 'id')

  if (!classroomId) {
    throw createError({ statusCode: 400, message: 'ID de aula requerido' })
  }

  const client = createServerSupabaseClient(event)

  // Get classroom info
  const { data: classroom } = await client
    .from('classrooms')
    .select('treasury_total, treasury_remaining, currency_name, currency_symbol, created_at')
    .eq('id', classroomId)
    .single()

  if (!classroom) {
    throw createError({ statusCode: 404, message: 'Aula no encontrada' })
  }

  // Get all wallets for calculations
  const { data: wallets } = await client
    .from('wallets')
    .select('id, balance, student_id')
    .eq('classroom_id', classroomId)
    .order('balance', { ascending: false })

  const balances = (wallets || []).map(w => w.balance)
  const totalStudents = balances.length

  if (totalStudents === 0) {
    return { data: { error: 'No hay estudiantes en el aula' } }
  }

  // === SUPPLY METRICS ===
  const circulatingSupply = balances.reduce((sum, b) => sum + b, 0)
  const totalSupply = classroom.treasury_total
  const treasuryRemaining = classroom.treasury_remaining
  const emittedSupply = totalSupply - treasuryRemaining
  const emissionRate = (emittedSupply / totalSupply) * 100

  // M1 = coins in active wallets (balance > 0)
  const m1Supply = balances.filter(b => b > 0).reduce((sum, b) => sum + b, 0)
  // M2 = all coins including those in small balances
  const m2Supply = circulatingSupply

  // === DISTRIBUTION METRICS ===
  const sortedBalances = [...balances].sort((a, b) => a - b)
  const avgBalance = circulatingSupply / totalStudents
  const medianBalance = totalStudents % 2 === 0
    ? (sortedBalances[totalStudents / 2 - 1] + sortedBalances[totalStudents / 2]) / 2
    : sortedBalances[Math.floor(totalStudents / 2)]

  // Standard deviation
  const variance = balances.reduce((sum, b) => sum + Math.pow(b - avgBalance, 2), 0) / totalStudents
  const stdDeviation = Math.sqrt(variance)
  const coefficientOfVariation = avgBalance > 0 ? (stdDeviation / avgBalance) * 100 : 0

  // Gini Index calculation
  let giniNumerator = 0
  for (let i = 0; i < totalStudents; i++) {
    for (let j = 0; j < totalStudents; j++) {
      giniNumerator += Math.abs(sortedBalances[i] - sortedBalances[j])
    }
  }
  const giniIndex = circulatingSupply > 0
    ? giniNumerator / (2 * totalStudents * totalStudents * avgBalance)
    : 0

  // Percentile distribution
  const getPercentileSum = (start: number, end: number) => {
    const startIdx = Math.floor(totalStudents * start)
    const endIdx = Math.floor(totalStudents * end)
    return sortedBalances.slice(startIdx, endIdx).reduce((sum, b) => sum + b, 0)
  }

  const bottom20Wealth = getPercentileSum(0, 0.2)
  const bottom50Wealth = getPercentileSum(0, 0.5)
  const top20Wealth = getPercentileSum(0.8, 1)
  const top10Wealth = getPercentileSum(0.9, 1)
  const top1Count = Math.max(1, Math.ceil(totalStudents * 0.01))
  const top1Wealth = sortedBalances.slice(-top1Count).reduce((sum, b) => sum + b, 0)

  // Palma Ratio: top 10% / bottom 40%
  const bottom40Wealth = getPercentileSum(0, 0.4)
  const palmaRatio = bottom40Wealth > 0 ? top10Wealth / bottom40Wealth : 0

  // 20/20 Ratio: top 20% / bottom 20%
  const ratio2020 = bottom20Wealth > 0 ? top20Wealth / bottom20Wealth : 0

  // === TRANSACTION METRICS ===
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const { data: weeklyTransactions } = await client
    .from('transactions')
    .select('amount, type, created_at')
    .eq('classroom_id', classroomId)
    .gte('created_at', sevenDaysAgo.toISOString())

  const { data: monthlyTransactions } = await client
    .from('transactions')
    .select('amount, type')
    .eq('classroom_id', classroomId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Volume calculations
  const weeklyVolume = (weeklyTransactions || []).reduce((sum, t) => sum + t.amount, 0)
  const weeklyCount = weeklyTransactions?.length || 0
  const monthlyVolume = (monthlyTransactions || []).reduce((sum, t) => sum + t.amount, 0)
  const monthlyCount = monthlyTransactions?.length || 0

  // Transaction type breakdown
  const weeklyByType = (weeklyTransactions || []).reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  // Velocity of money (weekly volume / circulating supply)
  const velocityWeekly = circulatingSupply > 0 ? weeklyVolume / circulatingSupply : 0
  const velocityMonthly = circulatingSupply > 0 ? monthlyVolume / circulatingSupply : 0

  // Transaction intensity (transactions per student per week)
  const transactionIntensity = weeklyCount / totalStudents

  // === MARKET METRICS ===
  const { data: marketItems } = await client
    .from('market_items')
    .select('base_price, current_price, stock, name')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)

  const activeItems = marketItems?.length || 0
  const avgBasePrice = activeItems > 0
    ? marketItems!.reduce((sum, i) => sum + i.base_price, 0) / activeItems
    : 0
  const avgCurrentPrice = activeItems > 0
    ? marketItems!.reduce((sum, i) => sum + i.current_price, 0) / activeItems
    : 0

  // Price index and inflation
  const priceIndex = avgBasePrice > 0 ? (avgCurrentPrice / avgBasePrice) * 100 : 100
  const inflationRate = avgBasePrice > 0 ? ((avgCurrentPrice - avgBasePrice) / avgBasePrice) * 100 : 0

  // Market cap (total value of all available stock at current prices)
  const marketCap = (marketItems || []).reduce((sum, item) => {
    const stock = item.stock ?? 999 // unlimited stock counts as high
    return sum + (item.current_price * Math.min(stock, 100))
  }, 0)

  // Purchasing power index
  const purchasingPowerIndex = avgCurrentPrice > 0 ? avgBalance / avgCurrentPrice : 0

  // Affordability: % of items that median student can afford
  const affordableItems = (marketItems || []).filter(i => i.current_price <= medianBalance).length
  const affordabilityRate = activeItems > 0 ? (affordableItems / activeItems) * 100 : 100

  // === DEMAND METRICS ===
  const { count: pendingPurchases } = await client
    .from('purchase_requests')
    .select('id', { count: 'exact' })
    .eq('classroom_id', classroomId)
    .eq('status', 'PENDING')

  const { count: pendingTransfers } = await client
    .from('transfer_requests')
    .select('id', { count: 'exact' })
    .eq('classroom_id', classroomId)
    .eq('status', 'PENDING')

  const totalPending = (pendingPurchases || 0) + (pendingTransfers || 0)
  const demandPressure = (totalPending / totalStudents) * 100

  // === LIQUIDITY METRICS ===
  // Liquidity ratio: circulating supply / market cap
  const liquidityRatio = marketCap > 0 ? circulatingSupply / marketCap : 1

  // Hot money: % of supply that moved in last week
  const hotMoneyRatio = circulatingSupply > 0 ? (weeklyVolume / circulatingSupply) * 100 : 0

  // Savings rate: % of students with balance > avg
  const saversCount = balances.filter(b => b > avgBalance).length
  const savingsRate = (saversCount / totalStudents) * 100

  // === ACTIVITY METRICS ===
  // Get unique participants in transactions
  const { data: activeWallets } = await client
    .from('transactions')
    .select('from_wallet_id, to_wallet_id')
    .eq('classroom_id', classroomId)
    .gte('created_at', sevenDaysAgo.toISOString())

  const activeWalletIds = new Set<string>()
  for (const tx of activeWallets || []) {
    if (tx.from_wallet_id) activeWalletIds.add(tx.from_wallet_id)
    if (tx.to_wallet_id) activeWalletIds.add(tx.to_wallet_id)
  }
  const participationRate = (activeWalletIds.size / totalStudents) * 100

  // === CONCENTRATION METRICS ===
  // Herfindahl-Hirschman Index (HHI) for wealth concentration
  // HHI = sum of squared market shares, ranges 0-10000
  const hhi = balances.reduce((sum, b) => {
    const share = circulatingSupply > 0 ? (b / circulatingSupply) * 100 : 0
    return sum + share * share
  }, 0)

  // Normalized HHI (0-1 scale)
  const hhiNormalized = (hhi - (10000 / totalStudents)) / (10000 - (10000 / totalStudents))

  // === BUILD RESPONSE ===
  const indicators = {
    // Monetary Supply
    supply: {
      total_supply: totalSupply,
      circulating_supply: circulatingSupply,
      treasury_remaining: treasuryRemaining,
      emitted_supply: emittedSupply,
      emission_rate: emissionRate.toFixed(1),
      m1_supply: m1Supply,
      m2_supply: m2Supply,
      education: {
        title: 'Oferta Monetaria',
        explanation: 'La cantidad total de dinero en la economía. M1 incluye solo dinero activo, M2 incluye todo el circulante.',
        real_world: 'Los bancos centrales (como el Banco de la República en Colombia) controlan cuánto dinero existe. Emitir mucho dinero puede causar inflación.',
        metrics: [
          { name: 'Total', value: totalSupply, desc: 'Monedas totales creadas para el aula' },
          { name: 'Circulando', value: circulatingSupply, desc: 'Monedas en manos de estudiantes' },
          { name: 'En Bolsa', value: treasuryRemaining, desc: 'Monedas disponibles para emitir' },
          { name: 'M1', value: m1Supply, desc: 'Dinero en cuentas activas (balance > 0)' },
        ],
        interpretation: treasuryRemaining < totalSupply * 0.2
          ? '⚠️ Quedan pocas monedas por emitir. La economía puede volverse más competitiva.'
          : '✅ Hay suficientes monedas en la bolsa para el resto del período.',
      },
    },

    // Distribution
    distribution: {
      gini_index: giniIndex.toFixed(3),
      gini_percent: (giniIndex * 100).toFixed(1),
      palma_ratio: palmaRatio.toFixed(2),
      ratio_20_20: ratio2020.toFixed(2),
      top_1_percent: circulatingSupply > 0 ? ((top1Wealth / circulatingSupply) * 100).toFixed(1) : '0',
      top_10_percent: circulatingSupply > 0 ? ((top10Wealth / circulatingSupply) * 100).toFixed(1) : '0',
      top_20_percent: circulatingSupply > 0 ? ((top20Wealth / circulatingSupply) * 100).toFixed(1) : '0',
      bottom_50_percent: circulatingSupply > 0 ? ((bottom50Wealth / circulatingSupply) * 100).toFixed(1) : '0',
      avg_balance: Math.round(avgBalance),
      median_balance: Math.round(medianBalance),
      std_deviation: Math.round(stdDeviation),
      coef_variation: coefficientOfVariation.toFixed(1),
      education: {
        title: 'Distribución de Riqueza',
        explanation: 'Mide qué tan equitativa es la distribución del dinero entre los estudiantes.',
        real_world: `Colombia tiene un Gini de ~0.51 (alto). Dinamarca ~0.28 (bajo). El Ratio Palma ideal es < 1.`,
        metrics: [
          { name: 'Índice Gini', value: giniIndex.toFixed(2), desc: '0=igualdad perfecta, 1=máxima desigualdad' },
          { name: 'Ratio Palma', value: palmaRatio.toFixed(2), desc: 'Top 10% / Bottom 40%' },
          { name: 'Ratio 20/20', value: ratio2020.toFixed(1), desc: 'Top 20% / Bottom 20%' },
          { name: 'Coef. Variación', value: coefficientOfVariation.toFixed(0) + '%', desc: 'Dispersión relativa' },
        ],
        interpretation: giniIndex < 0.3
          ? '✅ Distribución bastante equitativa. La riqueza está bien repartida.'
          : giniIndex < 0.5
            ? '⚠️ Hay desigualdad moderada. Algunos estudiantes tienen más que otros.'
            : '🔴 Alta desigualdad. Pocos estudiantes concentran la mayoría de la riqueza.',
      },
    },

    // Activity & Velocity
    velocity: {
      weekly_velocity: velocityWeekly.toFixed(2),
      monthly_velocity: velocityMonthly.toFixed(2),
      weekly_volume: weeklyVolume,
      monthly_volume: monthlyVolume,
      weekly_transactions: weeklyCount,
      monthly_transactions: monthlyCount,
      transaction_intensity: transactionIntensity.toFixed(2),
      participation_rate: participationRate.toFixed(1),
      hot_money_ratio: hotMoneyRatio.toFixed(1),
      volume_by_type: weeklyByType,
      education: {
        title: 'Velocidad del Dinero',
        explanation: 'Cuántas veces "circula" el dinero. Alta velocidad = economía activa con mucho intercambio.',
        real_world: 'En EE.UU., la velocidad del dinero ha bajado desde 2008, indicando menor actividad económica. En crisis, la gente ahorra más.',
        metrics: [
          { name: 'Velocidad Semanal', value: velocityWeekly.toFixed(2) + 'x', desc: 'Veces que circula el dinero por semana' },
          { name: 'Trans./Estudiante', value: transactionIntensity.toFixed(1), desc: 'Promedio de transacciones por estudiante' },
          { name: 'Participación', value: participationRate.toFixed(0) + '%', desc: 'Estudiantes activos esta semana' },
          { name: 'Dinero Caliente', value: hotMoneyRatio.toFixed(0) + '%', desc: 'Del circulante que se movió esta semana' },
        ],
        interpretation: velocityWeekly < 0.3
          ? '😴 Baja actividad. Los estudiantes están ahorrando o no hay suficientes incentivos para gastar.'
          : velocityWeekly < 1.0
            ? '✅ Actividad económica saludable. Buen balance entre ahorro y gasto.'
            : '🔥 Alta actividad. Mucho movimiento, posible presión inflacionaria.',
      },
    },

    // Prices & Inflation
    prices: {
      price_index: priceIndex.toFixed(1),
      inflation_rate: inflationRate.toFixed(1),
      avg_base_price: Math.round(avgBasePrice),
      avg_current_price: Math.round(avgCurrentPrice),
      active_items: activeItems,
      market_cap: marketCap,
      education: {
        title: 'Precios e Inflación',
        explanation: 'El índice de precios (base=100) muestra cambios en los precios. La inflación es el cambio porcentual.',
        real_world: 'El IPC (Índice de Precios al Consumidor) mide la inflación. Colombia en 2022-2023 tuvo inflación >13%, afectando el poder adquisitivo.',
        metrics: [
          { name: 'Índice de Precios', value: priceIndex.toFixed(0), desc: 'Base 100. >100=inflación, <100=deflación' },
          { name: 'Inflación', value: inflationRate.toFixed(1) + '%', desc: 'Cambio en precios vs precio base' },
          { name: 'Precio Promedio', value: Math.round(avgCurrentPrice), desc: 'Costo promedio de productos' },
          { name: 'Capitalización', value: marketCap, desc: 'Valor total del mercado' },
        ],
        interpretation: inflationRate < -5
          ? '📉 Deflación: los precios están bajando. Puede indicar baja demanda.'
          : inflationRate < 5
            ? '✅ Precios estables. Bueno para planificar compras.'
            : inflationRate < 15
              ? '⚠️ Inflación moderada. Los precios están subiendo.'
              : '🔴 Alta inflación. El poder adquisitivo está cayendo.',
      },
    },

    // Purchasing Power
    purchasing_power: {
      index: purchasingPowerIndex.toFixed(2),
      affordability_rate: affordabilityRate.toFixed(1),
      affordable_items: affordableItems,
      median_can_buy: avgCurrentPrice > 0 ? Math.floor(medianBalance / avgCurrentPrice) : 0,
      avg_can_buy: avgCurrentPrice > 0 ? Math.floor(avgBalance / avgCurrentPrice) : 0,
      education: {
        title: 'Poder Adquisitivo',
        explanation: 'Cuántos productos puede comprar un estudiante promedio con su balance actual.',
        real_world: 'El poder adquisitivo real se mide comparando salarios con precios. En Venezuela, la hiperinflación destruyó el poder adquisitivo.',
        metrics: [
          { name: 'Índice P.A.', value: purchasingPowerIndex.toFixed(1), desc: 'Productos promedio que puede comprar un estudiante' },
          { name: 'Asequibilidad', value: affordabilityRate.toFixed(0) + '%', desc: 'Productos que la mediana puede comprar' },
          { name: 'Mediana compra', value: avgCurrentPrice > 0 ? Math.floor(medianBalance / avgCurrentPrice) : 0, desc: 'Items que puede comprar el estudiante mediano' },
        ],
        interpretation: purchasingPowerIndex < 1
          ? '🔴 Bajo poder adquisitivo. Los productos son caros para el balance promedio.'
          : purchasingPowerIndex < 3
            ? '⚠️ Poder adquisitivo moderado. Los estudiantes deben elegir cuidadosamente.'
            : '✅ Buen poder adquisitivo. Los estudiantes pueden permitirse varios productos.',
      },
    },

    // Demand
    demand: {
      pending_purchases: pendingPurchases || 0,
      pending_transfers: pendingTransfers || 0,
      total_pending: totalPending,
      demand_pressure: demandPressure.toFixed(1),
      education: {
        title: 'Demanda Agregada',
        explanation: 'Las solicitudes pendientes muestran la intención de compra. Alta demanda = presión para subir precios.',
        real_world: 'Cuando hay mucha demanda (ej: consolas en Navidad), los precios suben. Es la ley de oferta y demanda.',
        metrics: [
          { name: 'Compras Pend.', value: pendingPurchases || 0, desc: 'Solicitudes de compra esperando aprobación' },
          { name: 'Transf. Pend.', value: pendingTransfers || 0, desc: 'Transferencias esperando aprobación' },
          { name: 'Presión', value: demandPressure.toFixed(0) + '%', desc: 'Demanda relativa al número de estudiantes' },
        ],
        interpretation: totalPending === 0
          ? '😴 Sin demanda pendiente. El mercado está tranquilo.'
          : demandPressure < 50
            ? '✅ Demanda normal. Hay interés en el mercado.'
            : '🔥 Alta demanda. Los precios pueden subir.',
      },
    },

    // Liquidity & Concentration
    market_structure: {
      liquidity_ratio: liquidityRatio.toFixed(2),
      hhi: Math.round(hhi),
      hhi_normalized: hhiNormalized.toFixed(3),
      savings_rate: savingsRate.toFixed(1),
      education: {
        title: 'Estructura de Mercado',
        explanation: 'Mide la liquidez (facilidad de compra/venta) y concentración de riqueza.',
        real_world: 'El índice HHI se usa para medir monopolios. Un HHI > 2500 indica mercado concentrado. La FTC usa esto para aprobar fusiones.',
        metrics: [
          { name: 'Liquidez', value: liquidityRatio.toFixed(2), desc: 'Dinero disponible vs valor del mercado' },
          { name: 'HHI', value: Math.round(hhi), desc: '< 1500: competitivo, > 2500: concentrado' },
          { name: 'Ahorradores', value: savingsRate.toFixed(0) + '%', desc: 'Estudiantes con balance > promedio' },
        ],
        interpretation: hhi < 1500
          ? '✅ Mercado competitivo. La riqueza está distribuida.'
          : hhi < 2500
            ? '⚠️ Concentración moderada. Algunos acumulan más riqueza.'
            : '🔴 Alta concentración. Pocos controlan mucha riqueza.',
      },
    },

    // Summary
    summary: {
      total_students: totalStudents,
      currency_name: classroom.currency_name,
      currency_symbol: classroom.currency_symbol,
      health_score: calculateHealthScore({
        gini: giniIndex,
        velocity: velocityWeekly,
        inflation: inflationRate,
        treasuryRatio: treasuryRemaining / totalSupply,
        participationRate,
        purchasingPower: purchasingPowerIndex,
      }),
      quick_stats: {
        richest_balance: Math.max(...balances),
        poorest_balance: Math.min(...balances),
        zero_balance_count: balances.filter(b => b === 0).length,
      },
    },
  }

  return { data: indicators }
})

interface HealthParams {
  gini: number
  velocity: number
  inflation: number
  treasuryRatio: number
  participationRate: number
  purchasingPower: number
}

function calculateHealthScore(params: HealthParams): { score: number; label: string; color: string; factors: string[] } {
  let score = 100
  const factors: string[] = []

  // Inequality (max -25)
  if (params.gini > 0.6) {
    score -= 25
    factors.push('Alta desigualdad')
  } else if (params.gini > 0.4) {
    score -= 15
    factors.push('Desigualdad moderada')
  } else if (params.gini > 0.3) {
    score -= 5
  }

  // Velocity (max -20)
  if (params.velocity < 0.2) {
    score -= 20
    factors.push('Muy baja actividad')
  } else if (params.velocity < 0.4) {
    score -= 10
    factors.push('Baja actividad')
  } else if (params.velocity > 2.5) {
    score -= 10
    factors.push('Actividad excesiva')
  }

  // Inflation (max -20)
  if (Math.abs(params.inflation) > 30) {
    score -= 20
    factors.push(params.inflation > 0 ? 'Inflación muy alta' : 'Deflación severa')
  } else if (Math.abs(params.inflation) > 15) {
    score -= 10
    factors.push(params.inflation > 0 ? 'Inflación alta' : 'Deflación')
  }

  // Treasury (max -15)
  if (params.treasuryRatio < 0.05) {
    score -= 15
    factors.push('Bolsa casi vacía')
  } else if (params.treasuryRatio < 0.15) {
    score -= 8
    factors.push('Bolsa baja')
  }

  // Participation (max -10)
  if (params.participationRate < 20) {
    score -= 10
    factors.push('Baja participación')
  } else if (params.participationRate < 40) {
    score -= 5
  }

  // Purchasing power (max -10)
  if (params.purchasingPower < 0.5) {
    score -= 10
    factors.push('Bajo poder adquisitivo')
  } else if (params.purchasingPower < 1) {
    score -= 5
  }

  score = Math.max(0, Math.min(100, score))

  let label: string
  let color: string

  if (score >= 80) {
    label = 'Excelente'
    color = 'green'
  } else if (score >= 60) {
    label = 'Buena'
    color = 'blue'
  } else if (score >= 40) {
    label = 'Regular'
    color = 'yellow'
  } else {
    label = 'Crítica'
    color = 'red'
  }

  return { score, label, color, factors }
}
