<script setup lang="ts">
const props = defineProps<{
  type: 'student' | 'teacher'
}>()

const studentActions = [
  { icon: '↗️', label: 'Enviar', path: '/student/transfer', color: 'from-blue-500 to-cyan-500' },
  { icon: '🛍️', label: 'Mercado', path: '/student/market', color: 'from-purple-500 to-pink-500' },
  { icon: '📊', label: 'Ranking', path: '/student/leaderboard', color: 'from-amber-500 to-orange-500' },
  { icon: '📜', label: 'Historial', path: '/student/wallet', color: 'from-emerald-500 to-teal-500' },
]

const teacherActions = [
  { icon: '💰', label: 'Emitir', path: '/teacher/emit', color: 'from-emerald-500 to-green-500' },
  { icon: '🏪', label: 'Mercado', path: '/teacher/market-admin', color: 'from-purple-500 to-pink-500' },
  { icon: '📋', label: 'Auditar', path: '/teacher/audit', color: 'from-blue-500 to-cyan-500' },
  { icon: '📈', label: 'Métricas', path: '/teacher/analytics', color: 'from-amber-500 to-orange-500' },
]

const actions = computed(() => props.type === 'student' ? studentActions : teacherActions)
</script>

<template>
  <div class="grid grid-cols-4 gap-3">
    <NuxtLink
      v-for="action in actions"
      :key="action.path"
      :to="action.path"
      class="action-button group"
    >
      <div
        class="action-icon"
        :class="`bg-gradient-to-br ${action.color}`"
      >
        <span class="text-xl group-active:scale-90 transition-transform">{{ action.icon }}</span>
      </div>
      <span class="text-xs text-surface-300 mt-2 font-medium">{{ action.label }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.action-button {
  @apply flex flex-col items-center py-3 rounded-2xl;
  @apply active:scale-95 transition-all duration-150;
  @apply hover:bg-surface-800/50;
}

.action-icon {
  @apply w-14 h-14 rounded-2xl flex items-center justify-center;
  @apply shadow-lg;
  box-shadow:
    0 8px 16px -4px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}
</style>
