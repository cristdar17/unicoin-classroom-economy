<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

interface SavingsRate {
  id: string
  lock_days: number
  interest_rate: string
  min_amount: number
  max_amount: number | null
  bonus_rate_threshold: number | null
  bonus_rate: string | null
  description: string | null
}

interface SavingsAccount {
  id: string
  amount: number
  interest_rate: number
  projected_interest: number
  final_amount: number | null
  lock_days: number
  start_date: string
  end_date: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  days_elapsed: number
  days_remaining: number
  progress: number
  is_mature: boolean
  can_withdraw: boolean
  early_withdrawal_amount: number
  current_value: number
  projected_total: number
}

interface SavingsSummary {
  total_locked: number
  total_projected_interest: number
  total_earned_all_time: number
  active_count: number
}

const { wallet, classroom, loading: sessionLoading, refresh } = useStudentSession()
const studentToken = useStudentToken()

const rates = ref<SavingsRate[]>([])
const savings = ref<{
  active: SavingsAccount[]
  completed: SavingsAccount[]
  cancelled: SavingsAccount[]
  summary: SavingsSummary
}>({
  active: [],
  completed: [],
  cancelled: [],
  summary: { total_locked: 0, total_projected_interest: 0, total_earned_all_time: 0, active_count: 0 }
})
const loading = ref(true)
const creating = ref(false)
const withdrawing = ref<string | null>(null)

// Create form
const selectedRate = ref<SavingsRate | null>(null)
const amount = ref<number>(0)
const showCreateModal = ref(false)
const showSuccessModal = ref(false)
const successMessage = ref('')

// Tab state
const activeTab = ref<'create' | 'active' | 'history'>('create')

// Load rates and savings
const loadData = async () => {
  if (!classroom.value) return
  loading.value = true

  try {
    const [ratesRes, savingsRes] = await Promise.all([
      $fetch(`/api/savings/rates?classroom_id=${classroom.value.id}`),
      $fetch('/api/savings/my-savings', {
        headers: { Authorization: `Bearer ${studentToken.value}` }
      })
    ])

    rates.value = ratesRes.data || []
    savings.value = savingsRes.data || savings.value
  } catch (e) {
    console.error('Error loading savings data:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

watch(() => classroom.value, loadData)

const canAfford = (minAmount: number) => (wallet.value?.balance || 0) >= minAmount

const hasActiveOfType = (lockDays: number) => {
  return savings.value.active.some(s => s.lock_days === lockDays)
}

const openCreateModal = (rate: SavingsRate) => {
  if (!canAfford(rate.min_amount) || hasActiveOfType(rate.lock_days)) return
  selectedRate.value = rate
  amount.value = rate.min_amount
  showCreateModal.value = true
}

// Check if amount qualifies for bonus rate
const hasBonus = computed(() => {
  if (!selectedRate.value || !amount.value) return false
  const threshold = selectedRate.value.bonus_rate_threshold
  return threshold && amount.value >= threshold
})

const baseRate = computed(() => {
  if (!selectedRate.value) return 0
  return parseFloat(selectedRate.value.interest_rate)
})

const bonusRate = computed(() => {
  if (!selectedRate.value || !hasBonus.value) return 0
  return parseFloat(selectedRate.value.bonus_rate || '0')
})

const totalRate = computed(() => {
  return baseRate.value + bonusRate.value
})

const calculateProjectedInterest = computed(() => {
  if (!selectedRate.value || !amount.value) return 0
  return Math.floor(amount.value * (totalRate.value / 100))
})

const calculateFinalAmount = computed(() => {
  return amount.value + calculateProjectedInterest.value
})

const createSavings = async () => {
  if (!selectedRate.value || !amount.value) return

  creating.value = true
  try {
    const response = await $fetch('/api/savings/create', {
      method: 'POST',
      body: {
        amount: amount.value,
        lock_days: selectedRate.value.lock_days
      },
      headers: { Authorization: `Bearer ${studentToken.value}` }
    })

    showCreateModal.value = false
    successMessage.value = response.data.message
    showSuccessModal.value = true

    // Refresh data
    await Promise.all([loadData(), refresh()])
    activeTab.value = 'active'

    setTimeout(() => {
      showSuccessModal.value = false
    }, 4000)
  } catch (e: any) {
    alert(e.data?.message || e.message || 'Error al crear bolsa de ahorro')
  } finally {
    creating.value = false
  }
}

const withdrawSavings = async (savingsId: string, isEarly: boolean) => {
  if (!confirm(isEarly
    ? 'Retiro anticipado: Perderás todo el interés acumulado. ¿Continuar?'
    : '¿Retirar tus ahorros con interés?')) {
    return
  }

  withdrawing.value = savingsId
  try {
    const response = await $fetch('/api/savings/withdraw', {
      method: 'POST',
      body: { savings_id: savingsId },
      headers: { Authorization: `Bearer ${studentToken.value}` }
    })

    successMessage.value = response.data.message
    showSuccessModal.value = true

    await Promise.all([loadData(), refresh()])

    setTimeout(() => {
      showSuccessModal.value = false
    }, 4000)
  } catch (e: any) {
    alert(e.data?.message || e.message || 'Error al retirar')
  } finally {
    withdrawing.value = null
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getLockDaysLabel = (days: number) => {
  if (days === 7) return '1 semana'
  if (days === 14) return '2 semanas'
  if (days === 30) return '1 mes'
  if (days === 60) return '2 meses'
  if (days === 90) return '3 meses'
  return `${days} días`
}

const getLockDaysEmoji = (days: number) => {
  if (days <= 7) return '🌱'
  if (days <= 14) return '🌿'
  if (days <= 30) return '🌳'
  if (days <= 60) return '💎'
  return '👑'
}
</script>

<template>
  <div class="min-h-screen pb-8">
    <!-- Header -->
    <div class="sticky top-0 z-20 px-4 pt-4 pb-3 bg-gradient-to-b from-surface-950 via-surface-950 to-transparent">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-white">CDT - Ahorro a Plazo</h1>
          <p class="text-surface-400 text-sm">Tasas variables según plazo y monto</p>
        </div>

        <!-- Balance pill -->
        <div class="flex items-center gap-2 px-4 py-2 rounded-full glass">
          <span class="text-lg font-bold text-white">{{ wallet?.balance?.toLocaleString() || 0 }}</span>
          <span class="text-lg">{{ classroom?.currency_symbol }}</span>
        </div>
      </div>

      <!-- Summary cards -->
      <div v-if="!loading && savings.summary" class="grid grid-cols-2 gap-3 mb-4">
        <div class="glass-card rounded-xl p-3">
          <div class="text-surface-400 text-xs">Ahorro activo</div>
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-bold text-white">{{ savings.summary.total_locked.toLocaleString() }}</span>
            <span class="text-surface-400">{{ classroom?.currency_symbol }}</span>
          </div>
        </div>
        <div class="glass-card rounded-xl p-3">
          <div class="text-surface-400 text-xs">Interés proyectado</div>
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-bold text-emerald-400">+{{ savings.summary.total_projected_interest.toLocaleString() }}</span>
            <span class="text-surface-400">{{ classroom?.currency_symbol }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2">
        <button
          v-for="tab in [
            { id: 'create', label: 'Crear', icon: '➕' },
            { id: 'active', label: 'Activas', icon: '🔒', count: savings.active.length },
            { id: 'history', label: 'Historial', icon: '📜' }
          ]"
          :key="tab.id"
          @click="activeTab = tab.id as any"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="activeTab === tab.id
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
            : 'bg-surface-800/50 text-surface-300 hover:bg-surface-800'"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.count"
            class="px-1.5 py-0.5 rounded-full text-xs"
            :class="activeTab === tab.id ? 'bg-white/20' : 'bg-primary-500/30 text-primary-300'"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="sessionLoading || loading" class="px-4 space-y-4">
      <div v-for="i in 4" :key="i" class="h-32 rounded-2xl skeleton" />
    </div>

    <!-- Create Tab -->
    <div v-else-if="activeTab === 'create'" class="px-4 space-y-3">
      <p class="text-surface-400 text-sm mb-4">
        Elige un plazo. A mayor plazo y monto, mejor tasa de interés.
      </p>

      <div
        v-for="rate in rates"
        :key="rate.id"
        class="savings-rate-card group"
        :class="[
          !canAfford(rate.min_amount) && 'opacity-50',
          hasActiveOfType(rate.lock_days) && 'opacity-50 border-amber-500/30'
        ]"
        @click="openCreateModal(rate)"
      >
        <div class="flex items-center gap-4">
          <!-- Emoji/Icon -->
          <div class="text-4xl">{{ getLockDaysEmoji(rate.lock_days) }}</div>

          <!-- Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-white">{{ getLockDaysLabel(rate.lock_days) }}</h3>
              <span
                v-if="hasActiveOfType(rate.lock_days)"
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30"
              >
                Activa
              </span>
            </div>
            <div class="text-surface-400 text-sm">
              {{ rate.description || `Mínimo: ${rate.min_amount}` }}
            </div>
            <div class="text-surface-500 text-xs mt-1">
              Mín: {{ rate.min_amount }} {{ classroom?.currency_symbol }}
              <span v-if="rate.max_amount"> · Máx: {{ rate.max_amount }}</span>
            </div>
          </div>

          <!-- Interest rate -->
          <div class="text-right">
            <div class="text-2xl font-bold text-emerald-400">+{{ rate.interest_rate }}%</div>
            <div v-if="rate.bonus_rate && parseFloat(rate.bonus_rate) > 0" class="text-xs">
              <span class="text-amber-400">+{{ rate.bonus_rate }}% bonus</span>
              <span class="text-surface-500 block">desde {{ rate.bonus_rate_threshold }}</span>
            </div>
            <div v-else class="text-surface-400 text-xs">tasa base</div>
          </div>
        </div>

        <!-- Unavailable reason -->
        <div v-if="!canAfford(rate.min_amount)" class="mt-3 text-red-400 text-sm">
          Saldo insuficiente
        </div>
        <div v-else-if="hasActiveOfType(rate.lock_days)" class="mt-3 text-amber-400 text-sm">
          Ya tienes un CDT activo de este plazo
        </div>
      </div>
    </div>

    <!-- Active Tab -->
    <div v-else-if="activeTab === 'active'" class="px-4 space-y-3">
      <div v-if="savings.active.length === 0" class="py-16 text-center">
        <div class="text-6xl mb-4">🏦</div>
        <h2 class="text-xl font-semibold text-white mb-2">Sin CDTs activos</h2>
        <p class="text-surface-400 mb-4">Crea un CDT para empezar a ganar intereses</p>
        <button
          @click="activeTab = 'create'"
          class="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-500 to-purple-500 text-white"
        >
          Crear CDT
        </button>
      </div>

      <div
        v-for="sav in savings.active"
        :key="sav.id"
        class="savings-account-card"
        :class="sav.is_mature && 'border-emerald-500/50 shadow-emerald-500/20'"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">{{ getLockDaysEmoji(sav.lock_days) }}</span>
              <h3 class="font-semibold text-white">{{ getLockDaysLabel(sav.lock_days) }}</h3>
              <span
                v-if="sav.is_mature"
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
              >
                Listo
              </span>
            </div>
            <div class="text-surface-400 text-sm">
              {{ formatDate(sav.start_date) }} → {{ formatDate(sav.end_date) }}
            </div>
          </div>

          <div class="text-right">
            <div class="text-xs text-surface-400">{{ sav.interest_rate }}% interés</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-surface-400">Progreso</span>
            <span :class="sav.is_mature ? 'text-emerald-400' : 'text-surface-300'">
              {{ sav.is_mature ? 'Completo' : `${sav.days_remaining} días restantes` }}
            </span>
          </div>
          <div class="h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="sav.is_mature ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'"
              :style="{ width: `${sav.progress}%` }"
            />
          </div>
        </div>

        <!-- Amounts -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="text-center">
            <div class="text-surface-400 text-xs mb-1">Depositado</div>
            <div class="font-semibold text-white">{{ sav.amount.toLocaleString() }}</div>
          </div>
          <div class="text-center">
            <div class="text-surface-400 text-xs mb-1">Interés</div>
            <div class="font-semibold text-emerald-400">+{{ sav.projected_interest.toLocaleString() }}</div>
          </div>
          <div class="text-center">
            <div class="text-surface-400 text-xs mb-1">Total</div>
            <div class="font-bold text-white">{{ sav.projected_total.toLocaleString() }}</div>
          </div>
        </div>

        <!-- Withdraw buttons -->
        <div class="flex gap-3">
          <button
            v-if="!sav.is_mature"
            @click="withdrawSavings(sav.id, true)"
            :disabled="withdrawing === sav.id"
            class="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
          >
            <span v-if="withdrawing === sav.id" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-surface-400/30 border-t-surface-400 rounded-full animate-spin" />
            </span>
            <span v-else>Retiro anticipado (pierdes interés)</span>
          </button>

          <button
            v-if="sav.is_mature"
            @click="withdrawSavings(sav.id, false)"
            :disabled="withdrawing === sav.id"
            class="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400 transition-all"
          >
            <span v-if="withdrawing === sav.id" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
            <span v-else>Retirar {{ sav.projected_total.toLocaleString() }} {{ classroom?.currency_symbol }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- History Tab -->
    <div v-else-if="activeTab === 'history'" class="px-4 space-y-3">
      <div v-if="savings.completed.length === 0 && savings.cancelled.length === 0" class="py-16 text-center">
        <div class="text-6xl mb-4">📜</div>
        <h2 class="text-xl font-semibold text-white mb-2">Sin historial</h2>
        <p class="text-surface-400">Aquí verás tus bolsas completadas y canceladas</p>
      </div>

      <!-- Completed -->
      <template v-if="savings.completed.length > 0">
        <h3 class="text-lg font-semibold text-white mb-2">Completadas</h3>
        <div
          v-for="sav in savings.completed"
          :key="sav.id"
          class="glass-card rounded-xl p-4 border-l-4 border-emerald-500"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ getLockDaysEmoji(sav.lock_days) }}</span>
              <span class="font-semibold text-white">{{ getLockDaysLabel(sav.lock_days) }}</span>
            </div>
            <span class="text-emerald-400 font-semibold">+{{ (sav.final_amount! - sav.amount).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-sm text-surface-400">
            <span>{{ sav.amount.toLocaleString() }} → {{ sav.final_amount?.toLocaleString() }}</span>
            <span>{{ formatDate(sav.end_date) }}</span>
          </div>
        </div>
      </template>

      <!-- Cancelled -->
      <template v-if="savings.cancelled.length > 0">
        <h3 class="text-lg font-semibold text-white mb-2 mt-6">Canceladas</h3>
        <div
          v-for="sav in savings.cancelled"
          :key="sav.id"
          class="glass-card rounded-xl p-4 border-l-4 border-red-500/50 opacity-75"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ getLockDaysEmoji(sav.lock_days) }}</span>
              <span class="font-semibold text-white">{{ getLockDaysLabel(sav.lock_days) }}</span>
            </div>
            <span class="text-red-400 text-sm">Interés perdido: {{ sav.projected_interest.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-sm text-surface-400">
            <span>Retirado: {{ sav.amount.toLocaleString() }}</span>
            <span>{{ formatDate(sav.start_date) }}</span>
          </div>
        </div>
      </template>

      <!-- Total earned -->
      <div v-if="savings.summary.total_earned_all_time > 0" class="mt-6 glass-card rounded-xl p-4 text-center">
        <div class="text-surface-400 text-sm mb-1">Total de intereses ganados</div>
        <div class="text-2xl font-bold text-emerald-400">
          +{{ savings.summary.total_earned_all_time.toLocaleString() }} {{ classroom?.currency_symbol }}
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showCreateModal && selectedRate"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="showCreateModal = false"
        >
          <div class="relative w-full max-w-sm glass-card rounded-3xl p-6">
            <h2 class="text-xl font-bold text-white mb-4">Crear CDT</h2>

            <div class="bg-surface-800/50 rounded-xl p-4 mb-4">
              <div class="flex items-center gap-3 mb-2">
                <span class="text-3xl">{{ getLockDaysEmoji(selectedRate.lock_days) }}</span>
                <div>
                  <h3 class="font-semibold text-white">{{ getLockDaysLabel(selectedRate.lock_days) }}</h3>
                  <div class="flex items-center gap-2">
                    <span class="text-emerald-400 font-medium">+{{ baseRate }}%</span>
                    <span v-if="hasBonus" class="text-amber-400 font-medium">+{{ bonusRate }}% bonus</span>
                    <span v-if="hasBonus" class="text-white font-bold">= {{ totalRate }}%</span>
                  </div>
                </div>
              </div>
              <!-- Bonus indicator -->
              <div v-if="selectedRate.bonus_rate_threshold && parseFloat(selectedRate.bonus_rate || '0') > 0" class="mt-3 text-xs">
                <div
                  v-if="hasBonus"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30"
                >
                  <span class="text-amber-400">🎯 Bonus aplicado por depositar {{ selectedRate.bonus_rate_threshold }}+ monedas</span>
                </div>
                <div
                  v-else
                  class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700/50 text-surface-400"
                >
                  <span>💡 Deposita {{ selectedRate.bonus_rate_threshold }}+ para obtener +{{ selectedRate.bonus_rate }}% extra</span>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Cantidad a depositar
              </label>
              <div class="relative">
                <input
                  v-model.number="amount"
                  type="number"
                  :min="selectedRate.min_amount"
                  :max="selectedRate.max_amount || wallet?.balance"
                  class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">
                  {{ classroom?.currency_symbol }}
                </span>
              </div>
              <div class="flex justify-between text-sm text-surface-400 mt-2">
                <span>Mín: {{ selectedRate.min_amount }}</span>
                <span>Disponible: {{ wallet?.balance?.toLocaleString() }}</span>
              </div>
            </div>

            <!-- Preview -->
            <div class="bg-surface-800/30 rounded-xl p-4 mb-4">
              <div class="flex justify-between mb-2">
                <span class="text-surface-400">Depósito</span>
                <span class="text-white font-medium">{{ amount.toLocaleString() }} {{ classroom?.currency_symbol }}</span>
              </div>
              <!-- Rate breakdown -->
              <div class="flex justify-between mb-1">
                <span class="text-surface-400">Tasa base</span>
                <span class="text-emerald-400 font-medium">{{ baseRate }}%</span>
              </div>
              <div v-if="hasBonus" class="flex justify-between mb-1">
                <span class="text-amber-400">Bonus por monto</span>
                <span class="text-amber-400 font-medium">+{{ bonusRate }}%</span>
              </div>
              <div class="flex justify-between mb-2">
                <span class="text-surface-400">Tasa efectiva</span>
                <span :class="hasBonus ? 'text-white font-bold' : 'text-emerald-400 font-medium'">{{ totalRate }}%</span>
              </div>
              <div class="border-t border-surface-700 my-2" />
              <div class="flex justify-between mb-2">
                <span class="text-surface-400">Interés ganado</span>
                <span class="text-emerald-400 font-medium">+{{ calculateProjectedInterest.toLocaleString() }} {{ classroom?.currency_symbol }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white font-semibold">Recibirás al vencer</span>
                <span class="text-white font-bold text-lg">{{ calculateFinalAmount.toLocaleString() }} {{ classroom?.currency_symbol }}</span>
              </div>
            </div>

            <p class="text-surface-400 text-sm mb-4">
              Tu CDT se bloquea por {{ selectedRate.lock_days }} días. El retiro anticipado devuelve solo el capital sin intereses.
            </p>

            <div class="flex gap-3">
              <button
                @click="showCreateModal = false"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="createSavings"
                :disabled="creating || amount < selectedRate.min_amount || amount > (wallet?.balance || 0)"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-500 to-purple-500 text-white hover:from-primary-400 hover:to-purple-400 transition-all disabled:opacity-50"
              >
                <span v-if="creating" class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
                <span v-else>Crear CDT</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click="showSuccessModal = false"
        >
          <div class="relative w-full max-w-sm glass-card rounded-3xl p-8 text-center animate-bounce-in">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-2xl font-bold text-white mb-2">Operación exitosa</h2>
            <p class="text-surface-300">{{ successMessage }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.savings-rate-card {
  @apply relative p-4 rounded-2xl transition-all duration-200 cursor-pointer;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.savings-rate-card:hover:not(.opacity-50) {
  @apply transform scale-[1.02];
  border-color: rgba(59, 130, 246, 0.3);
}

.savings-rate-card:active:not(.opacity-50) {
  @apply transform scale-[0.98];
}

.savings-account-card {
  @apply relative p-4 rounded-2xl;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
