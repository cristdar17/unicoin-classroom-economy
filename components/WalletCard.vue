<script setup lang="ts">
const props = defineProps<{
  balance: number
  currencyName: string
  currencySymbol: string
  studentName: string
  classroomName: string
}>()

const formattedBalance = computed(() => {
  return props.balance.toLocaleString()
})

// Animate balance on change
const displayBalance = ref(props.balance)
watch(() => props.balance, (newVal, oldVal) => {
  const diff = newVal - oldVal
  const steps = 20
  const increment = diff / steps
  let current = oldVal
  let step = 0

  const animate = () => {
    step++
    current += increment
    displayBalance.value = Math.round(current)
    if (step < steps) {
      requestAnimationFrame(animate)
    } else {
      displayBalance.value = newVal
    }
  }
  animate()
})
</script>

<template>
  <div class="wallet-card">
    <!-- Decorative elements -->
    <div class="absolute top-0 right-0 w-40 h-40 opacity-30">
      <div class="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div class="absolute top-8 right-8 w-20 h-20 rounded-full bg-white/20 blur-xl" />
    </div>

    <!-- Card content -->
    <div class="relative z-10">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <p class="text-white/60 text-sm mb-1">Mi Balance</p>
          <p class="text-white/40 text-xs">{{ classroomName }}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
          <span class="text-2xl">{{ currencySymbol }}</span>
        </div>
      </div>

      <!-- Balance -->
      <div class="mb-6">
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-bold text-white tracking-tight">
            {{ displayBalance.toLocaleString() }}
          </span>
          <span class="text-xl text-white/60">{{ currencySymbol }}</span>
        </div>
        <p class="text-white/50 text-sm mt-1">{{ currencyName }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10">
        <div>
          <p class="text-white/40 text-xs uppercase tracking-wider">Titular</p>
          <p class="text-white font-medium">{{ studentName }}</p>
        </div>
        <div class="flex gap-1">
          <div class="w-8 h-8 rounded-full bg-white/20" />
          <div class="w-8 h-8 rounded-full bg-white/30 -ml-3" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-card {
  @apply relative overflow-hidden rounded-3xl p-6;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  box-shadow:
    0 20px 40px -10px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  min-height: 200px;
}

/* Add subtle animation */
.wallet-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    to bottom right,
    transparent 40%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 60%
  );
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(25deg); }
  100% { transform: translateX(100%) rotate(25deg); }
}
</style>
