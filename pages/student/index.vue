<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

const { student, wallet, classroom, loading, refresh, notification } = useStudentSession()

// Economy indicators
const economyData = ref({
  inflationRate: 0,
  velocity: 0,
  myRank: 0,
  totalStudents: 0,
})

const loadEconomyData = async () => {
  if (!classroom.value) return

  try {
    const response = await $fetch(`/api/classroom/${classroom.value.id}/leaderboard`)
    const leaderboard = response.data || []

    economyData.value.totalStudents = leaderboard.length
    const myEntry = leaderboard.find((e: any) => e.student_id === student.value?.id)
    economyData.value.myRank = myEntry?.rank || 0
  } catch (e) {
    console.error('Error loading economy data:', e)
  }
}

watch([student, classroom], () => {
  if (student.value && classroom.value) {
    loadEconomyData()
  }
}, { immediate: true })

// Animated balance
const displayBalance = ref(0)
watch(() => wallet.value?.balance, (newVal) => {
  if (newVal === undefined) return
  const start = displayBalance.value
  const diff = newVal - start
  const duration = 1000
  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic

    displayBalance.value = Math.round(start + diff * eased)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}, { immediate: true })

// Treasury percentage
const treasuryPercent = computed(() => {
  if (!classroom.value?.treasury_total) return 100
  return Math.round((classroom.value.treasury_remaining / classroom.value.treasury_total) * 100)
})

// Greeting based on time
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Buenos días', emoji: '☀️' }
  if (hour < 18) return { text: 'Buenas tardes', emoji: '🌤️' }
  return { text: 'Buenas noches', emoji: '🌙' }
})

// Pull to refresh
const refreshing = ref(false)
const handleRefresh = async () => {
  refreshing.value = true
  await refresh()
  await loadEconomyData()
  refreshing.value = false
}

// Auto-refresh when tab becomes visible or every 30 seconds
let refreshInterval: ReturnType<typeof setInterval> | null = null

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refresh()
    loadEconomyData()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // Refresh every 30 seconds
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refresh()
    }
  }, 30000)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Realtime Notifications -->
    <Transition name="slide-down">
      <div
        v-if="notification?.show"
        class="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm"
      >
        <!-- Coins Received -->
        <div
          v-if="notification.type === 'coins_received'"
          class="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce-once"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">{{ classroom?.currency_symbol || '🪙' }}</span>
          </div>
          <div>
            <p class="font-bold">+{{ notification.amount?.toLocaleString() }}</p>
            <p class="text-sm text-white/80">Recibiste monedas</p>
          </div>
        </div>

        <!-- Purchase Approved -->
        <div
          v-else-if="notification.type === 'purchase_approved'"
          class="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce-once"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">✅</span>
          </div>
          <div>
            <p class="font-bold">Compra Aprobada</p>
            <p class="text-sm text-white/80">{{ notification.itemName }}</p>
          </div>
        </div>

        <!-- Purchase Rejected -->
        <div
          v-else-if="notification.type === 'purchase_rejected'"
          class="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">❌</span>
          </div>
          <div>
            <p class="font-bold">Compra Rechazada</p>
            <p class="text-sm text-white/80">{{ notification.itemName }}</p>
            <p v-if="notification.message" class="text-xs text-white/60 mt-1">{{ notification.message }}</p>
          </div>
        </div>

        <!-- Transfer Approved -->
        <div
          v-else-if="notification.type === 'transfer_approved'"
          class="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce-once"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">✅</span>
          </div>
          <div>
            <p class="font-bold">Transferencia Aprobada</p>
            <p class="text-sm text-white/80">{{ notification.amount?.toLocaleString() }} {{ classroom?.currency_symbol }}</p>
          </div>
        </div>

        <!-- Transfer Rejected -->
        <div
          v-else-if="notification.type === 'transfer_rejected'"
          class="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">❌</span>
          </div>
          <div>
            <p class="font-bold">Transferencia Rechazada</p>
            <p class="text-sm text-white/80">{{ notification.amount?.toLocaleString() }} {{ classroom?.currency_symbol }}</p>
            <p v-if="notification.message" class="text-xs text-white/60 mt-1">{{ notification.message }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Background effects -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="orb orb-primary w-[400px] h-[400px] -top-32 -right-32 opacity-50" />
      <div class="orb orb-accent w-[300px] h-[300px] bottom-32 -left-32 opacity-30" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center animate-pulse">
          <span class="text-4xl">🪙</span>
        </div>
        <p class="text-surface-400">Cargando tu wallet...</p>
      </div>
    </div>

    <div v-else-if="student && wallet && classroom" class="relative z-10 px-4 pt-4 pb-8">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-2 text-surface-400 text-sm mb-1">
            <span>{{ greeting.emoji }}</span>
            <span>{{ greeting.text }}</span>
          </div>
          <h1 class="text-2xl font-bold text-white">{{ student.name.split(' ')[0] }}</h1>
        </div>

        <div class="flex items-center gap-2">
          <!-- Refresh button -->
          <button
            @click="handleRefresh"
            :disabled="refreshing"
            class="p-3 rounded-xl glass hover:bg-surface-700/50 transition-colors"
          >
            <svg
              class="w-5 h-5 text-surface-400"
              :class="refreshing && 'animate-spin'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <!-- Profile button -->
          <NuxtLink
            to="/student/profile"
            class="p-3 rounded-xl glass hover:bg-surface-700/50 transition-colors"
          >
            <svg class="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </NuxtLink>
        </div>
      </header>

      <!-- Main Balance Card -->
      <section class="mb-6">
        <div class="balance-card">
          <!-- Animated background -->
          <div class="absolute inset-0 overflow-hidden rounded-3xl">
            <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-purple-500/10 rounded-full blur-3xl" />
          </div>

          <!-- Content -->
          <div class="relative z-10">
            <div class="flex items-start justify-between mb-6">
              <div>
                <p class="text-white/60 text-sm mb-1">Balance disponible</p>
                <p class="text-white/40 text-xs">{{ classroom.name }}</p>
              </div>
              <div class="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                <span class="text-3xl">{{ classroom.currency_symbol }}</span>
              </div>
            </div>

            <!-- Balance -->
            <div class="mb-8">
              <div class="flex items-baseline gap-3">
                <span class="text-6xl font-bold text-white tracking-tight">
                  {{ displayBalance.toLocaleString() }}
                </span>
              </div>
              <p class="text-white/50 mt-2">{{ classroom.currency_name }}</p>
            </div>

            <!-- Stats row -->
            <div class="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                <p class="text-white/40 text-xs uppercase tracking-wider">Ranking</p>
                <p class="text-white font-semibold">
                  #{{ economyData.myRank }} <span class="text-white/40 font-normal">de {{ economyData.totalStudents }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="text-white/40 text-xs uppercase tracking-wider">Bolsa</p>
                <p class="text-white font-semibold">{{ treasuryPercent }}% disp.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="mb-8">
        <div class="grid grid-cols-4 gap-3">
          <NuxtLink
            to="/student/transfer"
            class="action-item group"
          >
            <div class="action-icon from-blue-500 to-cyan-500">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <span class="action-label">Enviar</span>
          </NuxtLink>

          <NuxtLink
            to="/student/market"
            class="action-item group"
          >
            <div class="action-icon from-purple-500 to-pink-500">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span class="action-label">Mercado</span>
          </NuxtLink>

          <NuxtLink
            to="/student/leaderboard"
            class="action-item group"
          >
            <div class="action-icon from-amber-500 to-orange-500">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="action-label">Ranking</span>
          </NuxtLink>

          <NuxtLink
            to="/student/my-activity"
            class="action-item group"
          >
            <div class="action-icon from-emerald-500 to-teal-500">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span class="action-label">Actividad</span>
          </NuxtLink>
        </div>

        <!-- Secondary Actions -->
        <div class="grid grid-cols-2 gap-3 mt-4">
          <NuxtLink
            to="/student/badges"
            class="flex items-center gap-3 p-4 glass-card rounded-xl hover:bg-surface-700/50 transition-colors"
          >
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
              <span class="text-xl">🎖️</span>
            </div>
            <div>
              <p class="font-medium text-white text-sm">Insignias</p>
              <p class="text-xs text-surface-400">Tus logros</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/student/indicators"
            class="flex items-center gap-3 p-4 glass-card rounded-xl hover:bg-surface-700/50 transition-colors"
          >
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <span class="text-xl">📊</span>
            </div>
            <div>
              <p class="font-medium text-white text-sm">Indicadores</p>
              <p class="text-xs text-surface-400">Aprende economía</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Treasury Section -->
      <section class="mb-8">
        <div class="glass-card rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <span class="text-xl">🏦</span>
              </div>
              <div>
                <h3 class="font-semibold text-white">Bolsa del Curso</h3>
                <p class="text-xs text-surface-400">Monedas restantes para emitir</p>
              </div>
            </div>
            <div
              class="text-2xl font-bold"
              :class="[
                treasuryPercent > 50 && 'text-emerald-400',
                treasuryPercent <= 50 && treasuryPercent > 20 && 'text-amber-400',
                treasuryPercent <= 20 && 'text-red-400',
              ]"
            >
              {{ treasuryPercent }}%
            </div>
          </div>

          <!-- Progress bar -->
          <div class="relative h-3 bg-surface-700 rounded-full overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 progress-glow"
              :class="[
                treasuryPercent > 50 && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
                treasuryPercent <= 50 && treasuryPercent > 20 && 'bg-gradient-to-r from-amber-500 to-amber-400',
                treasuryPercent <= 20 && 'bg-gradient-to-r from-red-500 to-red-400',
              ]"
              :style="{ width: treasuryPercent + '%' }"
            />
          </div>

          <div class="flex justify-between mt-3 text-sm">
            <span class="text-surface-400">
              {{ (classroom.treasury_remaining || 0).toLocaleString() }} disponibles
            </span>
            <span class="text-surface-500">
              de {{ (classroom.treasury_total || 0).toLocaleString() }}
            </span>
          </div>
        </div>
      </section>

      <!-- Recent Activity -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Actividad Reciente</h2>
          <NuxtLink to="/student/wallet" class="text-primary-400 text-sm font-medium hover:text-primary-300">
            Ver todo →
          </NuxtLink>
        </div>
        <StudentRecentTransactions :wallet-id="wallet.id" :limit="5" />
      </section>
    </div>

    <!-- Not authenticated -->
    <div v-else class="flex items-center justify-center min-h-screen px-4">
      <div class="text-center">
        <div class="text-6xl mb-4">🔐</div>
        <h2 class="text-xl font-bold text-white mb-2">Sesión expirada</h2>
        <p class="text-surface-400 mb-6">Vuelve a ingresar para continuar</p>
        <NuxtLink
          to="/join"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors"
        >
          Ingresar
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-card {
  @apply relative overflow-hidden rounded-3xl p-6;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  box-shadow:
    0 25px 50px -12px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.action-item {
  @apply flex flex-col items-center gap-2 py-3;
  @apply active:scale-95 transition-transform;
}

.action-icon {
  @apply w-14 h-14 rounded-2xl flex items-center justify-center text-white;
  @apply bg-gradient-to-br shadow-lg;
  @apply group-hover:scale-105 transition-transform;
}

.action-label {
  @apply text-xs font-medium text-surface-400 group-hover:text-white transition-colors;
}

/* Notification animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

@keyframes bounce-once {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-8px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-4px); }
}

.animate-bounce-once {
  animation: bounce-once 0.6s ease-in-out;
}
</style>
