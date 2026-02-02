<script setup lang="ts">
import type { Classroom } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const classrooms = ref<Classroom[]>([])
const selectedClassroom = ref<string>('')
const loading = ref(true)
const loadingIndicators = ref(false)
const indicators = ref<any>(null)
const expandedSection = ref<string | null>(null)
const tooltipVisible = ref<string | null>(null)

// Load classrooms
onMounted(async () => {
  if (!user.value) return

  try {
    const { data } = await client
      .from('classrooms')
      .select('*')
      .eq('teacher_id', user.value.id)
      .order('name')

    classrooms.value = data || []

    if (classrooms.value.length === 1) {
      selectedClassroom.value = classrooms.value[0].id
    }
  } catch (e) {
    console.error('Error loading classrooms:', e)
  } finally {
    loading.value = false
  }
})

// Load indicators when classroom changes
watch(selectedClassroom, async (classroomId) => {
  if (!classroomId) return

  loadingIndicators.value = true

  try {
    const response = await $fetch(`/api/classroom/${classroomId}/indicators`)
    indicators.value = response.data
  } catch (e) {
    console.error('Error loading indicators:', e)
  } finally {
    loadingIndicators.value = false
  }
})

const selectedClassroomData = computed(() =>
  classrooms.value.find(c => c.id === selectedClassroom.value)
)

const toggleSection = (section: string) => {
  expandedSection.value = expandedSection.value === section ? null : section
}

const showTooltip = (id: string) => {
  tooltipVisible.value = id
}

const hideTooltip = () => {
  tooltipVisible.value = null
}

const getHealthColor = (color: string) => {
  const colors: Record<string, string> = {
    green: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  }
  return colors[color] || colors.blue
}

const getHealthBg = (color: string) => {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500/20 border-emerald-500/30',
    blue: 'bg-blue-500/20 border-blue-500/30',
    yellow: 'bg-amber-500/20 border-amber-500/30',
    red: 'bg-red-500/20 border-red-500/30',
  }
  return colors[color] || colors.blue
}

const formatNumber = (n: number | string) => {
  const num = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(num) ? n : num.toLocaleString()
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">Indicadores Económicos</h1>
      <p class="text-surface-400">Análisis completo de la economía de tu aula</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else>
      <div v-if="classrooms.length === 0" class="text-center py-12">
        <p class="text-surface-400">No tienes aulas.</p>
      </div>

      <div v-else>
        <!-- Classroom selector -->
        <div class="mb-6">
          <select
            v-model="selectedClassroom"
            class="w-full md:w-auto px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>Selecciona un aula</option>
            <option
              v-for="classroom in classrooms"
              :key="classroom.id"
              :value="classroom.id"
            >
              {{ classroom.name }} ({{ classroom.currency_symbol }})
            </option>
          </select>
        </div>

        <template v-if="selectedClassroom">
          <div v-if="loadingIndicators" class="text-surface-400 py-8 text-center">
            Calculando indicadores...
          </div>

          <div v-else-if="indicators" class="space-y-6">
            <!-- Health Score Card -->
            <div
              class="rounded-2xl p-6 border"
              :class="getHealthBg(indicators.summary.health_score.color)"
            >
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p class="text-surface-300 text-sm">Salud Económica del Aula</p>
                  <p class="text-3xl font-bold text-white">
                    {{ indicators.summary.health_score.label }}
                  </p>
                  <p class="text-surface-400 mt-1">
                    {{ indicators.summary.total_students }} estudiantes · {{ indicators.summary.currency_name }}
                  </p>
                </div>
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br shadow-lg"
                  :class="getHealthColor(indicators.summary.health_score.color)"
                >
                  {{ indicators.summary.health_score.score }}
                </div>
              </div>

              <div v-if="indicators.summary.health_score.factors?.length" class="flex flex-wrap gap-2 mt-4">
                <span
                  v-for="factor in indicators.summary.health_score.factors"
                  :key="factor"
                  class="px-3 py-1 bg-white/10 rounded-lg text-sm text-white/80"
                >
                  {{ factor }}
                </span>
              </div>
            </div>

            <!-- Quick Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p class="text-sm text-surface-400">Circulando</p>
                <p class="text-2xl font-bold text-emerald-400">
                  {{ formatNumber(indicators.supply.circulating_supply) }}
                </p>
                <p class="text-xs text-surface-500">{{ indicators.summary.currency_symbol }}</p>
              </div>
              <div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p class="text-sm text-surface-400">En Bolsa</p>
                <p class="text-2xl font-bold text-amber-400">
                  {{ formatNumber(indicators.supply.treasury_remaining) }}
                </p>
                <p class="text-xs text-surface-500">{{ indicators.supply.emission_rate }}% emitido</p>
              </div>
              <div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p class="text-sm text-surface-400">Inflación</p>
                <p
                  class="text-2xl font-bold"
                  :class="parseFloat(indicators.prices.inflation_rate) > 0 ? 'text-red-400' : 'text-emerald-400'"
                >
                  {{ indicators.prices.inflation_rate }}%
                </p>
                <p class="text-xs text-surface-500">vs precio base</p>
              </div>
              <div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p class="text-sm text-surface-400">Gini</p>
                <p
                  class="text-2xl font-bold"
                  :class="[
                    parseFloat(indicators.distribution.gini_index) < 0.3 && 'text-emerald-400',
                    parseFloat(indicators.distribution.gini_index) >= 0.3 && parseFloat(indicators.distribution.gini_index) < 0.5 && 'text-amber-400',
                    parseFloat(indicators.distribution.gini_index) >= 0.5 && 'text-red-400',
                  ]"
                >
                  {{ indicators.distribution.gini_index }}
                </p>
                <p class="text-xs text-surface-500">desigualdad</p>
              </div>
            </div>

            <!-- Supply Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('supply')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">💰</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.supply.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      {{ indicators.supply.emission_rate }}% del total emitido
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'supply' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'supply'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    v-for="metric in indicators.supply.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('s-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ formatNumber(metric.value) }}</p>

                    <div
                      v-if="tooltipVisible === 's-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <!-- Progress bar -->
                <div>
                  <div class="flex justify-between text-sm text-surface-400 mb-2">
                    <span>Emitido</span>
                    <span>{{ indicators.supply.emission_rate }}%</span>
                  </div>
                  <div class="h-4 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                      :style="{ width: indicators.supply.emission_rate + '%' }"
                    />
                  </div>
                </div>

                <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-blue-200">
                    <strong>📚 Concepto:</strong> {{ indicators.supply.education.explanation }}
                  </p>
                  <p class="text-blue-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.supply.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.supply.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Distribution Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('distribution')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">⚖️</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.distribution.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      Top 10% tiene {{ indicators.distribution.top_10_percent }}% de la riqueza
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'distribution' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'distribution'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    v-for="metric in indicators.distribution.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('d-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ metric.value }}</p>

                    <div
                      v-if="tooltipVisible === 'd-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <!-- Wealth distribution bars -->
                <div class="bg-surface-800 rounded-xl p-4">
                  <p class="text-sm text-surface-400 mb-4">Distribución de la Riqueza</p>
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-surface-400 w-20">Top 1%</span>
                      <div class="flex-1 h-5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-red-500 rounded-full"
                          :style="{ width: indicators.distribution.top_1_percent + '%' }"
                        />
                      </div>
                      <span class="text-sm text-white w-14 text-right">{{ indicators.distribution.top_1_percent }}%</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-surface-400 w-20">Top 10%</span>
                      <div class="flex-1 h-5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-orange-500 rounded-full"
                          :style="{ width: indicators.distribution.top_10_percent + '%' }"
                        />
                      </div>
                      <span class="text-sm text-white w-14 text-right">{{ indicators.distribution.top_10_percent }}%</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-surface-400 w-20">Top 20%</span>
                      <div class="flex-1 h-5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-amber-500 rounded-full"
                          :style="{ width: indicators.distribution.top_20_percent + '%' }"
                        />
                      </div>
                      <span class="text-sm text-white w-14 text-right">{{ indicators.distribution.top_20_percent }}%</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-surface-400 w-20">Bottom 50%</span>
                      <div class="flex-1 h-5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-emerald-500 rounded-full"
                          :style="{ width: indicators.distribution.bottom_50_percent + '%' }"
                        />
                      </div>
                      <span class="text-sm text-white w-14 text-right">{{ indicators.distribution.bottom_50_percent }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Balance stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div class="bg-surface-800 rounded-xl p-4 text-center">
                    <p class="text-xs text-surface-500">Promedio</p>
                    <p class="text-xl font-bold text-white">{{ formatNumber(indicators.distribution.avg_balance) }}</p>
                  </div>
                  <div class="bg-surface-800 rounded-xl p-4 text-center">
                    <p class="text-xs text-surface-500">Mediana</p>
                    <p class="text-xl font-bold text-white">{{ formatNumber(indicators.distribution.median_balance) }}</p>
                  </div>
                  <div class="bg-surface-800 rounded-xl p-4 text-center">
                    <p class="text-xs text-surface-500">Desv. Estándar</p>
                    <p class="text-xl font-bold text-white">{{ formatNumber(indicators.distribution.std_deviation) }}</p>
                  </div>
                  <div class="bg-surface-800 rounded-xl p-4 text-center">
                    <p class="text-xs text-surface-500">Coef. Variación</p>
                    <p class="text-xl font-bold text-white">{{ indicators.distribution.coef_variation }}%</p>
                  </div>
                </div>

                <div class="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-purple-200">
                    <strong>📚 Concepto:</strong> {{ indicators.distribution.education.explanation }}
                  </p>
                  <p class="text-purple-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.distribution.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.distribution.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Velocity Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('velocity')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🔄</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.velocity.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      {{ indicators.velocity.weekly_transactions }} transacciones esta semana
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'velocity' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'velocity'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    v-for="metric in indicators.velocity.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('v-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ metric.value }}</p>

                    <div
                      v-if="tooltipVisible === 'v-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <!-- Volume by type -->
                <div v-if="indicators.velocity.volume_by_type" class="bg-surface-800 rounded-xl p-4">
                  <p class="text-sm text-surface-400 mb-3">Volumen por Tipo (semana)</p>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div v-for="(amount, type) in indicators.velocity.volume_by_type" :key="type" class="text-center">
                      <p class="text-xs text-surface-500">{{ type }}</p>
                      <p class="text-lg font-bold text-white">{{ formatNumber(amount) }}</p>
                    </div>
                  </div>
                </div>

                <div class="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-cyan-200">
                    <strong>📚 Concepto:</strong> {{ indicators.velocity.education.explanation }}
                  </p>
                  <p class="text-cyan-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.velocity.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.velocity.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Prices Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('prices')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">📈</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.prices.education.title }}</h3>
                    <p
                      class="text-sm"
                      :class="parseFloat(indicators.prices.inflation_rate) > 0 ? 'text-red-400' : 'text-emerald-400'"
                    >
                      {{ parseFloat(indicators.prices.inflation_rate) > 0 ? '+' : '' }}{{ indicators.prices.inflation_rate }}% inflación
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'prices' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'prices'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    v-for="metric in indicators.prices.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('p-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ formatNumber(metric.value) }}</p>

                    <div
                      v-if="tooltipVisible === 'p-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <div class="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-amber-200">
                    <strong>📚 Concepto:</strong> {{ indicators.prices.education.explanation }}
                  </p>
                  <p class="text-amber-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.prices.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.prices.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Purchasing Power Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('pp')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">💳</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.purchasing_power.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      {{ indicators.purchasing_power.affordability_rate }}% de productos asequibles
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'pp' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'pp'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="metric in indicators.purchasing_power.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('pp-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ metric.value }}</p>

                    <div
                      v-if="tooltipVisible === 'pp-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <div class="bg-pink-900/20 border border-pink-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-pink-200">
                    <strong>📚 Concepto:</strong> {{ indicators.purchasing_power.education.explanation }}
                  </p>
                  <p class="text-pink-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.purchasing_power.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.purchasing_power.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Market Structure Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('market')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🏛️</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.market_structure.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      HHI: {{ indicators.market_structure.hhi }}
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'market' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'market'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="metric in indicators.market_structure.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('m-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ metric.value }}</p>

                    <div
                      v-if="tooltipVisible === 'm-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-indigo-200">
                    <strong>📚 Concepto:</strong> {{ indicators.market_structure.education.explanation }}
                  </p>
                  <p class="text-indigo-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.market_structure.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.market_structure.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Demand Section -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 overflow-hidden">
              <button
                @click="toggleSection('demand')"
                class="w-full p-5 flex items-center justify-between text-left hover:bg-surface-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🛒</span>
                  <div>
                    <h3 class="font-semibold text-white">{{ indicators.demand.education.title }}</h3>
                    <p class="text-sm text-surface-400">
                      {{ indicators.demand.total_pending }} solicitudes pendientes
                    </p>
                  </div>
                </div>
                <span class="text-surface-400 transition-transform" :class="expandedSection === 'demand' && 'rotate-180'">
                  ▼
                </span>
              </button>

              <div v-if="expandedSection === 'demand'" class="px-5 pb-5 space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="metric in indicators.demand.education.metrics"
                    :key="metric.name"
                    class="bg-surface-800 rounded-xl p-4 relative"
                    @mouseenter="showTooltip('de-' + metric.name)"
                    @mouseleave="hideTooltip"
                  >
                    <p class="text-xs text-surface-500 flex items-center gap-1">
                      {{ metric.name }}
                      <span class="text-surface-600 cursor-help">ⓘ</span>
                    </p>
                    <p class="text-xl font-bold text-white">{{ metric.value }}</p>

                    <div
                      v-if="tooltipVisible === 'de-' + metric.name"
                      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-600 rounded-lg text-xs text-white shadow-lg w-48"
                    >
                      {{ metric.desc }}
                    </div>
                  </div>
                </div>

                <div class="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p class="text-rose-200">
                    <strong>📚 Concepto:</strong> {{ indicators.demand.education.explanation }}
                  </p>
                  <p class="text-rose-300/80">
                    <strong>🌍 Mundo real:</strong> {{ indicators.demand.education.real_world }}
                  </p>
                  <p class="text-white font-medium">{{ indicators.demand.education.interpretation }}</p>
                </div>
              </div>
            </div>

            <!-- Quick Stats Summary -->
            <div class="rounded-2xl bg-surface-800/50 border border-surface-700/50 p-5">
              <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Resumen Rápido
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <p class="text-2xl font-bold text-white">{{ formatNumber(indicators.summary.quick_stats.richest_balance) }}</p>
                  <p class="text-xs text-surface-400">Balance más alto</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-white">{{ formatNumber(indicators.summary.quick_stats.poorest_balance) }}</p>
                  <p class="text-xs text-surface-400">Balance más bajo</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-amber-400">{{ indicators.summary.quick_stats.zero_balance_count }}</p>
                  <p class="text-xs text-surface-400">Con balance 0</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-emerald-400">{{ indicators.prices.active_items }}</p>
                  <p class="text-xs text-surface-400">Productos activos</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
