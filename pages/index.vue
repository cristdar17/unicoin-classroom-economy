<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const features = [
  { icon: '💰', title: 'Economía Real', desc: 'Oferta y demanda dinámica' },
  { icon: '📈', title: 'Precios Vivos', desc: 'Fluctúan según el mercado' },
  { icon: '🏆', title: 'Compite', desc: 'Ranking en tiempo real' },
  { icon: '🎁', title: 'Canjea', desc: 'Décimas, tiempo extra y más' },
]

const benefits = [
  '+0.5 en parciales',
  'Extensión de entregas',
  'Salida temprano',
  'Habilitar talleres',
]

// Animate numbers
const animatedCoins = ref(0)
const targetCoins = 10000

onMounted(() => {
  const duration = 2000
  const steps = 60
  const increment = targetCoins / steps
  let current = 0

  const animate = () => {
    current += increment
    animatedCoins.value = Math.min(Math.floor(current), targetCoins)
    if (current < targetCoins) {
      requestAnimationFrame(animate)
    }
  }

  setTimeout(animate, 500)
})
</script>

<template>
  <div class="min-h-screen relative overflow-hidden bg-surface-950">
    <!-- Aurora Background -->
    <div class="aurora-bg" />

    <!-- Floating Orbs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="orb orb-primary w-[500px] h-[500px] -top-48 -left-48" style="animation-delay: 0s" />
      <div class="orb orb-secondary w-[400px] h-[400px] top-1/2 -right-32" style="animation-delay: -5s" />
      <div class="orb orb-accent w-[300px] h-[300px] bottom-0 left-1/3" style="animation-delay: -10s" />
    </div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex flex-col px-6">
      <!-- Nav spacer -->
      <div class="h-8" />

      <!-- Hero Section -->
      <div class="flex-1 flex flex-col items-center justify-center py-8 max-w-lg mx-auto w-full">
        <!-- Animated Logo -->
        <div class="relative mb-8">
          <!-- Glow ring -->
          <div class="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 blur-2xl opacity-50 animate-pulse" />

          <!-- Logo container -->
          <div class="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl">
            <div class="w-full h-full rounded-3xl bg-surface-900 flex items-center justify-center">
              <span class="text-6xl coin-bounce">🪙</span>
            </div>
          </div>

          <!-- Orbiting particles -->
          <div class="absolute inset-0 animate-spin" style="animation-duration: 8s">
            <div class="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-primary-400 shadow-lg shadow-primary-400/50" />
          </div>
          <div class="absolute inset-0 animate-spin" style="animation-duration: 12s; animation-direction: reverse">
            <div class="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-5xl md:text-6xl font-bold text-center mb-4">
          <span class="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            UniCoin
          </span>
        </h1>

        <p class="text-xl text-surface-300 text-center mb-3">
          Economía de aula con precios dinámicos
        </p>

        <!-- Animated counter -->
        <div class="flex items-center gap-2 mb-8">
          <span class="text-surface-400">Bolsa inicial:</span>
          <span class="text-2xl font-bold text-primary-400 font-mono">
            {{ animatedCoins.toLocaleString() }}
          </span>
          <span class="text-2xl">🪙</span>
        </div>

        <!-- Features Grid -->
        <div class="grid grid-cols-2 gap-3 mb-8 w-full">
          <div
            v-for="(feature, i) in features"
            :key="feature.title"
            class="glass-card glass-card-hover rounded-2xl p-4 text-center"
            :style="{ animationDelay: i * 100 + 'ms' }"
          >
            <div class="text-3xl mb-2">{{ feature.icon }}</div>
            <div class="font-semibold text-white text-sm">{{ feature.title }}</div>
            <div class="text-xs text-surface-400">{{ feature.desc }}</div>
          </div>
        </div>

        <!-- Benefits ticker -->
        <div class="w-full mb-8 overflow-hidden">
          <div class="flex gap-4 animate-marquee">
            <div
              v-for="(benefit, i) in [...benefits, ...benefits]"
              :key="i"
              class="flex-shrink-0 px-4 py-2 rounded-full bg-surface-800/50 border border-surface-700/50 text-sm text-surface-300"
            >
              {{ benefit }}
            </div>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="flex flex-col gap-4 w-full">
          <NuxtLink
            to="/join"
            class="group relative overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <!-- Animated border gradient -->
            <div class="absolute inset-0 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-2xl gradient-animate" />

            <!-- Button content -->
            <div class="relative flex items-center justify-center gap-3 px-8 py-4 bg-surface-900 rounded-2xl">
              <span class="text-2xl">🎓</span>
              <span class="text-lg font-semibold text-white">Soy Estudiante</span>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/login"
            class="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl glass-card glass-card-hover"
          >
            <span class="text-2xl">👨‍🏫</span>
            <span class="text-lg font-semibold text-surface-200 group-hover:text-white transition-colors">
              Soy Docente
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- Footer -->
      <footer class="py-6 text-center">
        <p class="text-surface-500 text-sm flex items-center justify-center gap-2">
          Hecho con <span class="text-pink-500">♥</span> para la educación
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 15s linear infinite;
}
</style>
