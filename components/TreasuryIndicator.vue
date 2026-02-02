<script setup lang="ts">
const props = defineProps<{
  total: number
  remaining: number
  symbol: string
  compact?: boolean
}>()

const percentage = computed(() =>
  Math.round((props.remaining / props.total) * 100)
)

const statusColor = computed(() => {
  if (percentage.value > 50) return 'emerald'
  if (percentage.value > 20) return 'amber'
  return 'red'
})

const circumference = 2 * Math.PI * 45
const strokeDashoffset = computed(() =>
  circumference - (percentage.value / 100) * circumference
)
</script>

<template>
  <!-- Compact version for headers -->
  <div v-if="compact" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/80 backdrop-blur">
    <div class="relative w-5 h-5">
      <svg class="w-5 h-5 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="45"
          stroke="currentColor"
          stroke-width="10"
          fill="none"
          class="text-surface-700"
        />
        <circle
          cx="50" cy="50" r="45"
          stroke="currentColor"
          stroke-width="10"
          fill="none"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          :class="[
            statusColor === 'emerald' && 'text-emerald-400',
            statusColor === 'amber' && 'text-amber-400',
            statusColor === 'red' && 'text-red-400',
          ]"
          class="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
    <span class="text-xs font-medium text-surface-300">
      {{ remaining.toLocaleString() }} {{ symbol }}
    </span>
  </div>

  <!-- Full version -->
  <div v-else class="treasury-card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <span class="text-lg">🏦</span>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-surface-200">Bolsa del Curso</h3>
          <p class="text-xs text-surface-400">Monedas disponibles</p>
        </div>
      </div>
      <div
        class="px-2 py-1 rounded-full text-xs font-bold"
        :class="[
          statusColor === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
          statusColor === 'amber' && 'bg-amber-500/20 text-amber-400',
          statusColor === 'red' && 'bg-red-500/20 text-red-400',
        ]"
      >
        {{ percentage }}%
      </div>
    </div>

    <!-- Circular progress -->
    <div class="flex items-center gap-6">
      <div class="relative w-24 h-24 flex-shrink-0">
        <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <!-- Background circle -->
          <circle
            cx="50" cy="50" r="45"
            stroke="currentColor"
            stroke-width="8"
            fill="none"
            class="text-surface-700"
          />
          <!-- Progress circle -->
          <circle
            cx="50" cy="50" r="45"
            stroke="currentColor"
            stroke-width="8"
            fill="none"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            :class="[
              statusColor === 'emerald' && 'text-emerald-400',
              statusColor === 'amber' && 'text-amber-400',
              statusColor === 'red' && 'text-red-400',
            ]"
            class="transition-all duration-1000 ease-out"
          />
        </svg>
        <!-- Center icon -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-3xl animate-pulse-slow">{{ symbol }}</span>
        </div>
      </div>

      <div class="flex-1">
        <div class="mb-3">
          <div class="text-2xl font-bold text-white">
            {{ remaining.toLocaleString() }}
          </div>
          <div class="text-sm text-surface-400">
            de {{ total.toLocaleString() }} disponibles
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000 ease-out"
            :class="[
              statusColor === 'emerald' && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
              statusColor === 'amber' && 'bg-gradient-to-r from-amber-500 to-amber-400',
              statusColor === 'red' && 'bg-gradient-to-r from-red-500 to-red-400',
            ]"
            :style="{ width: percentage + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.treasury-card {
  @apply p-5 rounded-2xl;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.3);
}
</style>
