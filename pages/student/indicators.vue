<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

const { student, classroom, loading: sessionLoading } = useStudentSession()

const loading = ref(true)
const activeTab = ref<'macro' | 'micro'>('micro')
const macroIndicators = ref<any>(null)
const microIndicators = ref<any>(null)
const expandedSection = ref<string | null>(null)
const tooltipVisible = ref<string | null>(null)

const loadData = async () => {
  if (!classroom.value) return

  const studentToken = useStudentToken()

  try {
    // Load both macro and micro indicators in parallel
    const [macroResponse, microResponse] = await Promise.all([
      $fetch(`/api/classroom/${classroom.value.id}/indicators`),
      $fetch('/api/student/my-indicators', {
        headers: { Authorization: `Bearer ${studentToken.value}` },
        query: { classroom_id: classroom.value.id },
      }).catch(() => null),
    ])

    macroIndicators.value = macroResponse.data
    microIndicators.value = microResponse?.data
  } catch (e) {
    console.error('Error loading indicators:', e)
  } finally {
    loading.value = false
  }
}

watch(classroom, () => {
  if (classroom.value) {
    loadData()
  }
}, { immediate: true })

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
  <div class="p-4 pb-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <NuxtLink to="/student" class="text-surface-400 hover:text-white">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-white">Indicadores</h1>
        <p class="text-surface-400 text-sm">Aprende economía con datos reales</p>
      </div>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-2 mb-6 p-1 bg-surface-800/50 rounded-xl">
      <button
        @click="activeTab = 'micro'"
        class="flex-1 py-2.5 px-4 rounded-lg font-medium transition-all"
        :class="activeTab === 'micro'
          ? 'bg-primary-600 text-white'
          : 'text-surface-400 hover:text-white'"
      >
        Mi Economía
      </button>
      <button
        @click="activeTab = 'macro'"
        class="flex-1 py-2.5 px-4 rounded-lg font-medium transition-all"
        :class="activeTab === 'macro'
          ? 'bg-primary-600 text-white'
          : 'text-surface-400 hover:text-white'"
      >
        Economía del Aula
      </button>
    </div>

    <!-- Loading -->
    <div v-if="sessionLoading || loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="h-32 rounded-2xl skeleton" />
    </div>

    <!-- MICRO INDICATORS (Personal) -->
    <template v-else-if="activeTab === 'micro' && microIndicators">
      <!-- Status Card -->
      <div
        class="rounded-2xl p-5 mb-6 border"
        :class="getHealthBg(microIndicators.summary.overall_status.color)"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-surface-300 text-sm">Tu Estado</p>
            <p class="text-2xl font-bold text-white">
              {{ microIndicators.summary.overall_status.emoji }}
              {{ microIndicators.summary.overall_status.label }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-4xl font-bold text-white">
              #{{ microIndicators.position.rank }}
            </p>
            <p class="text-surface-400 text-sm">
              de {{ microIndicators.position.total_students }}
            </p>
          </div>
        </div>
      </div>

      <!-- Position Section -->
      <div class="glass-card rounded-2xl overflow-hidden mb-4">
        <button
          @click="toggleSection('position')"
          class="w-full p-4 flex items-center justify-between text-left"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">📊</span>
            <div>
              <h3 class="font-semibold text-white">Tu Posición</h3>
              <p class="text-sm text-surface-400">
                Percentil {{ microIndicators.position.percentile }}%
              </p>
            </div>
          </div>
          <span class="text-surface-400 transition-transform" :class="expandedSection === 'position' && 'rotate-180'">
            ▼
          </span>
        </button>

        <div v-if="expandedSection === 'position'" class="px-4 pb-4 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-surface-800/50 rounded-xl p-3 text-center relative">
              <p class="text-xs text-surface-500">Balance</p>
              <p class="text-xl font-bold text-white">
                {{ formatNumber(microIndicators.position.balance) }}
              </p>
              <p class="text-xs text-surface-500">{{ microIndicators.summary.currency_symbol }}</p>
            </div>
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Tu Parte</p>
              <p class="text-xl font-bold text-primary-400">{{ microIndicators.position.wealth_share }}%</p>
              <p class="text-xs text-surface-500">del total</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">vs Mediana</p>
              <p
                class="text-lg font-bold"
                :class="parseFloat(microIndicators.position.vs_median) >= 0 ? 'text-emerald-400' : 'text-red-400'"
              >
                {{ parseFloat(microIndicators.position.vs_median) >= 0 ? '+' : '' }}{{ microIndicators.position.vs_median }}%
              </p>
            </div>
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">vs Promedio</p>
              <p
                class="text-lg font-bold"
                :class="parseFloat(microIndicators.position.vs_average) >= 0 ? 'text-emerald-400' : 'text-red-400'"
              >
                {{ parseFloat(microIndicators.position.vs_average) >= 0 ? '+' : '' }}{{ microIndicators.position.vs_average }}%
              </p>
            </div>
          </div>

          <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200">
            {{ microIndicators.position.education.interpretation }}
          </div>
        </div>
      </div>

      <!-- Financial Health Section -->
      <div class="glass-card rounded-2xl overflow-hidden mb-4">
        <button
          @click="toggleSection('financial')"
          class="w-full p-4 flex items-center justify-between text-left"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">💰</span>
            <div>
              <h3 class="font-semibold text-white">Salud Financiera</h3>
              <p class="text-sm" :class="parseFloat(microIndicators.financial_health.savings_rate) > 0 ? 'text-emerald-400' : 'text-red-400'">
                Ahorro: {{ microIndicators.financial_health.savings_rate }}%
              </p>
            </div>
          </div>
          <span class="text-surface-400 transition-transform" :class="expandedSection === 'financial' && 'rotate-180'">
            ▼
          </span>
        </button>

        <div v-if="expandedSection === 'financial'" class="px-4 pb-4 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="metric in microIndicators.financial_health.education.metrics"
              :key="metric.name"
              class="bg-surface-800/50 rounded-xl p-3 relative"
              @mouseenter="showTooltip(metric.name)"
              @mouseleave="hideTooltip"
            >
              <p class="text-xs text-surface-500 flex items-center gap-1">
                {{ metric.name }}
                <span class="text-surface-600 cursor-help">ⓘ</span>
              </p>
              <p class="text-lg font-bold text-white">{{ metric.value }}</p>

              <!-- Tooltip -->
              <div
                v-if="tooltipVisible === metric.name"
                class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
              >
                {{ metric.desc }}
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
              </div>
            </div>
          </div>

          <!-- Income vs Spending -->
          <div class="bg-surface-800/50 rounded-xl p-4">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm text-surface-400">Ingresos vs Gastos (mes)</span>
            </div>
            <div class="flex gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <div class="w-3 h-3 rounded-full bg-emerald-500" />
                  <span class="text-xs text-surface-400">Ingresos</span>
                </div>
                <p class="text-lg font-bold text-emerald-400">
                  +{{ formatNumber(microIndicators.income.monthly) }}
                </p>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <div class="w-3 h-3 rounded-full bg-red-500" />
                  <span class="text-xs text-surface-400">Gastos</span>
                </div>
                <p class="text-lg font-bold text-red-400">
                  -{{ formatNumber(microIndicators.spending.monthly) }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-sm text-green-200">
            {{ microIndicators.financial_health.education.interpretation }}
          </div>
        </div>
      </div>

      <!-- Purchasing Power Section -->
      <div class="glass-card rounded-2xl overflow-hidden mb-4">
        <button
          @click="toggleSection('purchasing')"
          class="w-full p-4 flex items-center justify-between text-left"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🛒</span>
            <div>
              <h3 class="font-semibold text-white">Poder de Compra</h3>
              <p class="text-sm text-surface-400">
                {{ microIndicators.purchasing_power.items_affordable }}/{{ microIndicators.purchasing_power.total_items }} productos
              </p>
            </div>
          </div>
          <span class="text-surface-400 transition-transform" :class="expandedSection === 'purchasing' && 'rotate-180'">
            ▼
          </span>
        </button>

        <div v-if="expandedSection === 'purchasing'" class="px-4 pb-4 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Asequibilidad</p>
              <p class="text-xl font-bold text-white">{{ microIndicators.purchasing_power.affordability_rate }}%</p>
            </div>
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Índice P.A.</p>
              <p class="text-xl font-bold text-white">{{ microIndicators.purchasing_power.purchasing_power_index }}</p>
            </div>
          </div>

          <div v-if="microIndicators.purchasing_power.best_affordable" class="bg-surface-800/50 rounded-xl p-4">
            <p class="text-xs text-surface-500 mb-2">Mejor producto que puedes comprar</p>
            <div class="flex justify-between items-center">
              <span class="font-medium text-white">{{ microIndicators.purchasing_power.best_affordable.name }}</span>
              <span class="text-primary-400">{{ microIndicators.purchasing_power.best_affordable.price }} {{ microIndicators.summary.currency_symbol }}</span>
            </div>
          </div>

          <div class="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 text-sm text-purple-200">
            {{ microIndicators.purchasing_power.education.interpretation }}
          </div>
        </div>
      </div>

      <!-- Activity Section -->
      <div class="glass-card rounded-2xl overflow-hidden mb-4">
        <button
          @click="toggleSection('activity')"
          class="w-full p-4 flex items-center justify-between text-left"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚡</span>
            <div>
              <h3 class="font-semibold text-white">Actividad</h3>
              <p class="text-sm text-surface-400">
                {{ microIndicators.activity.weekly_transactions }} transacciones esta semana
              </p>
            </div>
          </div>
          <span class="text-surface-400 transition-transform" :class="expandedSection === 'activity' && 'rotate-180'">
            ▼
          </span>
        </button>

        <div v-if="expandedSection === 'activity'" class="px-4 pb-4 space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Semana</p>
              <p class="text-xl font-bold text-white">{{ microIndicators.activity.weekly_transactions }}</p>
            </div>
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Mes</p>
              <p class="text-xl font-bold text-white">{{ microIndicators.activity.monthly_transactions }}</p>
            </div>
            <div class="bg-surface-800/50 rounded-xl p-3 text-center">
              <p class="text-xs text-surface-500">Total</p>
              <p class="text-xl font-bold text-white">{{ microIndicators.activity.total_transactions }}</p>
            </div>
          </div>

          <div v-if="microIndicators.activity.active_streaks > 0" class="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">🔥</span>
              <span class="font-medium text-amber-200">Rachas Activas</span>
            </div>
            <div class="flex gap-4">
              <div>
                <span class="text-2xl font-bold text-white">{{ microIndicators.activity.active_streaks }}</span>
                <span class="text-surface-400 text-sm ml-1">rachas</span>
              </div>
              <div>
                <span class="text-2xl font-bold text-white">{{ microIndicators.activity.best_streak }}</span>
                <span class="text-surface-400 text-sm ml-1">mejor racha</span>
              </div>
            </div>
          </div>

          <div class="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4 text-sm text-cyan-200">
            {{ microIndicators.activity.education.interpretation }}
          </div>
        </div>
      </div>
    </template>

    <!-- MACRO INDICATORS (Classroom) -->
    <template v-else-if="activeTab === 'macro' && macroIndicators">
      <!-- Health Score -->
      <div
        class="rounded-2xl p-5 mb-6 border"
        :class="getHealthBg(macroIndicators.summary.health_score.color)"
      >
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-surface-300 text-sm">Salud Económica</p>
            <p class="text-2xl font-bold text-white">
              {{ macroIndicators.summary.health_score.label }}
            </p>
          </div>
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold bg-gradient-to-br"
            :class="getHealthColor(macroIndicators.summary.health_score.color)"
          >
            {{ macroIndicators.summary.health_score.score }}
          </div>
        </div>

        <div v-if="macroIndicators.summary.health_score.factors?.length" class="flex flex-wrap gap-2">
          <span
            v-for="factor in macroIndicators.summary.health_score.factors"
            :key="factor"
            class="px-2 py-1 bg-white/10 rounded text-xs text-white/80"
          >
            {{ factor }}
          </span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-surface-800/50 rounded-xl p-3 text-center">
          <p class="text-xs text-surface-500">Estudiantes</p>
          <p class="text-xl font-bold text-white">{{ macroIndicators.summary.total_students }}</p>
        </div>
        <div class="bg-surface-800/50 rounded-xl p-3 text-center">
          <p class="text-xs text-surface-500">Circulando</p>
          <p class="text-xl font-bold text-emerald-400">{{ formatNumber(macroIndicators.supply.circulating_supply) }}</p>
        </div>
        <div class="bg-surface-800/50 rounded-xl p-3 text-center">
          <p class="text-xs text-surface-500">Inflación</p>
          <p
            class="text-xl font-bold"
            :class="parseFloat(macroIndicators.prices.inflation_rate) > 0 ? 'text-red-400' : 'text-emerald-400'"
          >
            {{ macroIndicators.prices.inflation_rate }}%
          </p>
        </div>
      </div>

      <!-- Indicator Sections -->
      <div class="space-y-4">
        <!-- Supply -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('supply')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">💰</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.supply.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  {{ macroIndicators.supply.emission_rate }}% emitido
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'supply' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'supply'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="metric in macroIndicators.supply.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('supply-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ formatNumber(metric.value) }}</p>

                <div
                  v-if="tooltipVisible === 'supply-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <!-- Progress bar -->
            <div>
              <div class="flex justify-between text-xs text-surface-400 mb-1">
                <span>Emitido</span>
                <span>{{ macroIndicators.supply.emission_rate }}%</span>
              </div>
              <div class="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                  :style="{ width: macroIndicators.supply.emission_rate + '%' }"
                />
              </div>
            </div>

            <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-blue-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.supply.education.explanation }}
              </p>
              <p class="text-blue-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.supply.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.supply.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Distribution -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('distribution')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">⚖️</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.distribution.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  Gini: {{ macroIndicators.distribution.gini_index }}
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'distribution' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'distribution'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="metric in macroIndicators.distribution.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('dist-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ metric.value }}</p>

                <div
                  v-if="tooltipVisible === 'dist-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <!-- Wealth distribution visualization -->
            <div class="bg-surface-800/50 rounded-xl p-4">
              <p class="text-xs text-surface-500 mb-3">Distribución de Riqueza</p>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-surface-400 w-20">Top 10%</span>
                  <div class="flex-1 h-4 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-red-500 rounded-full"
                      :style="{ width: macroIndicators.distribution.top_10_percent + '%' }"
                    />
                  </div>
                  <span class="text-xs text-white w-12 text-right">{{ macroIndicators.distribution.top_10_percent }}%</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-surface-400 w-20">Bottom 50%</span>
                  <div class="flex-1 h-4 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-emerald-500 rounded-full"
                      :style="{ width: macroIndicators.distribution.bottom_50_percent + '%' }"
                    />
                  </div>
                  <span class="text-xs text-white w-12 text-right">{{ macroIndicators.distribution.bottom_50_percent }}%</span>
                </div>
              </div>
            </div>

            <div class="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-purple-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.distribution.education.explanation }}
              </p>
              <p class="text-purple-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.distribution.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.distribution.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Velocity -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('velocity')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🔄</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.velocity.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  {{ macroIndicators.velocity.weekly_velocity }}x por semana
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'velocity' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'velocity'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="metric in macroIndicators.velocity.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('vel-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ metric.value }}</p>

                <div
                  v-if="tooltipVisible === 'vel-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <div class="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-cyan-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.velocity.education.explanation }}
              </p>
              <p class="text-cyan-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.velocity.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.velocity.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Prices -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('prices')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">📈</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.prices.education.title }}</h3>
                <p
                  class="text-sm"
                  :class="parseFloat(macroIndicators.prices.inflation_rate) > 0 ? 'text-red-400' : 'text-emerald-400'"
                >
                  {{ parseFloat(macroIndicators.prices.inflation_rate) > 0 ? '+' : '' }}{{ macroIndicators.prices.inflation_rate }}% inflación
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'prices' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'prices'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="metric in macroIndicators.prices.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('price-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ formatNumber(metric.value) }}</p>

                <div
                  v-if="tooltipVisible === 'price-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <div class="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-amber-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.prices.education.explanation }}
              </p>
              <p class="text-amber-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.prices.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.prices.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Purchasing Power -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('pp')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">💳</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.purchasing_power.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  Índice: {{ macroIndicators.purchasing_power.index }}
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'pp' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'pp'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="metric in macroIndicators.purchasing_power.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('pp-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ metric.value }}</p>

                <div
                  v-if="tooltipVisible === 'pp-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <div class="bg-pink-900/20 border border-pink-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-pink-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.purchasing_power.education.explanation }}
              </p>
              <p class="text-pink-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.purchasing_power.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.purchasing_power.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Market Structure -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('market')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏛️</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.market_structure.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  HHI: {{ macroIndicators.market_structure.hhi }}
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'market' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'market'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="metric in macroIndicators.market_structure.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('mkt-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ metric.value }}</p>

                <div
                  v-if="tooltipVisible === 'mkt-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-indigo-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.market_structure.education.explanation }}
              </p>
              <p class="text-indigo-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.market_structure.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.market_structure.education.interpretation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Demand -->
        <div class="glass-card rounded-2xl overflow-hidden">
          <button
            @click="toggleSection('demand')"
            class="w-full p-4 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🛒</span>
              <div>
                <h3 class="font-semibold text-white">{{ macroIndicators.demand.education.title }}</h3>
                <p class="text-sm text-surface-400">
                  {{ macroIndicators.demand.total_pending }} solicitudes pendientes
                </p>
              </div>
            </div>
            <span class="text-surface-400 transition-transform" :class="expandedSection === 'demand' && 'rotate-180'">
              ▼
            </span>
          </button>

          <div v-if="expandedSection === 'demand'" class="px-4 pb-4 space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="metric in macroIndicators.demand.education.metrics"
                :key="metric.name"
                class="bg-surface-800/50 rounded-xl p-3 relative"
                @mouseenter="showTooltip('dem-' + metric.name)"
                @mouseleave="hideTooltip"
              >
                <p class="text-xs text-surface-500 flex items-center gap-1">
                  {{ metric.name }}
                  <span class="text-surface-600 cursor-help">ⓘ</span>
                </p>
                <p class="text-lg font-bold text-white">{{ metric.value }}</p>

                <div
                  v-if="tooltipVisible === 'dem-' + metric.name"
                  class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-700 rounded-lg text-xs text-white shadow-lg w-48"
                >
                  {{ metric.desc }}
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-700" />
                </div>
              </div>
            </div>

            <div class="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 space-y-2 text-sm">
              <p class="text-rose-200">
                <strong>📚 ¿Qué significa?</strong><br>
                {{ macroIndicators.demand.education.explanation }}
              </p>
              <p class="text-rose-300/80">
                <strong>🌍 En el mundo real:</strong><br>
                {{ macroIndicators.demand.education.real_world }}
              </p>
              <p class="text-white">
                {{ macroIndicators.demand.education.interpretation }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- No data -->
    <div v-else class="text-center py-12">
      <p class="text-surface-400">No hay datos disponibles</p>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  @apply bg-surface-800 animate-pulse;
}
</style>
