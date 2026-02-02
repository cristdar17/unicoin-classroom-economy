<script setup lang="ts">
// Teacher dashboard layout with sidebar (desktop) / bottom nav (mobile)

const route = useRoute()
const user = useSupabaseUser()
const { pendingCount, newRequestNotification } = useTeacherRealtime()

const navItems = [
  { path: '/teacher', icon: 'dashboard', label: 'Dashboard' },
  { path: '/teacher/emit', icon: 'coins', label: 'Emitir' },
  { path: '/teacher/approvals', icon: 'check', label: 'Aprobar', showBadge: true },
  { path: '/teacher/market-admin', icon: 'store', label: 'Mercado' },
  { path: '/teacher/audit', icon: 'clipboard', label: 'Auditoría' },
  { path: '/teacher/analytics', icon: 'chart', label: 'Métricas' },
]

const isActive = (path: string) => {
  if (path === '/teacher') return route.path === '/teacher'
  return route.path.startsWith(path)
}

const handleLogout = async () => {
  const client = useSupabaseClient()
  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-surface-900 text-surface-100">
    <!-- New Request Notification -->
    <Transition name="slide-down">
      <div
        v-if="newRequestNotification"
        class="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md md:left-auto md:right-8"
      >
        <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-xl">{{ newRequestNotification.type === 'purchase' ? '🛒' : '💸' }}</span>
          </div>
          <div class="flex-1">
            <p class="font-bold">Nueva solicitud</p>
            <p class="text-sm text-white/80">
              {{ newRequestNotification.studentName }} - {{ newRequestNotification.amount.toLocaleString() }} monedas
            </p>
          </div>
          <NuxtLink
            to="/teacher/approvals"
            class="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
          >
            Ver
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Desktop sidebar -->
    <aside class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div class="flex flex-col flex-grow bg-surface-800 border-r border-surface-700 overflow-y-auto">
        <!-- Logo -->
        <div class="flex items-center h-16 px-4 border-b border-surface-700">
          <span class="text-2xl mr-2">🪙</span>
          <span class="text-xl font-bold text-primary-400">UniCoin</span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-2 py-4 space-y-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center px-4 py-3 rounded-lg transition-colors relative"
            :class="isActive(item.path)
              ? 'bg-primary-600 text-white'
              : 'text-surface-300 hover:bg-surface-700 hover:text-white'"
          >
            <span class="text-lg mr-3">{{ getEmoji(item.icon) }}</span>
            <span>{{ item.label }}</span>

            <!-- Badge for pending requests -->
            <span
              v-if="item.showBadge && pendingCount > 0"
              class="absolute right-3 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full"
            >
              {{ pendingCount > 99 ? '99+' : pendingCount }}
            </span>
          </NuxtLink>
        </nav>

        <!-- User info & logout -->
        <div class="p-4 border-t border-surface-700">
          <div class="text-sm text-surface-400 truncate mb-2">
            {{ user?.email }}
          </div>
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="md:pl-64">
      <!-- Mobile header -->
      <header class="md:hidden flex items-center justify-between h-14 px-4 bg-surface-800 border-b border-surface-700">
        <div class="flex items-center">
          <span class="text-xl mr-2">🪙</span>
          <span class="font-bold text-primary-400">UniCoin</span>
        </div>
        <button
          @click="handleLogout"
          class="text-surface-400 hover:text-white"
        >
          Salir
        </button>
      </header>

      <div class="p-4 md:p-8 pb-24 md:pb-8">
        <slot />
      </div>
    </main>

    <!-- Mobile bottom navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-700 safe-area-bottom">
      <div class="flex justify-around">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center py-2 px-2 transition-colors relative"
          :class="isActive(item.path) ? 'text-primary-400' : 'text-surface-400'"
        >
          <span class="text-lg relative">
            {{ getEmoji(item.icon) }}
            <!-- Mobile badge -->
            <span
              v-if="item.showBadge && pendingCount > 0"
              class="absolute -top-1 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full"
            >
              {{ pendingCount > 9 ? '9+' : pendingCount }}
            </span>
          </span>
          <span class="text-xs mt-1">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script lang="ts">
const emojiMap: Record<string, string> = {
  dashboard: '📊',
  coins: '💰',
  check: '✅',
  store: '🏪',
  clipboard: '📋',
  chart: '📈',
}

function getEmoji(icon: string): string {
  return emojiMap[icon] || '📌'
}
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
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
</style>
