<script setup lang="ts">
// Default layout with aurora background
</script>

<template>
  <div class="min-h-screen bg-surface-950 text-surface-100 relative">
    <!-- Aurora background effect -->
    <div class="aurora-bg" />

    <!-- Floating orbs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        class="orb orb-primary w-[500px] h-[500px] -top-48 -left-48"
        style="animation-delay: 0s"
      />
      <div
        class="orb orb-secondary w-[400px] h-[400px] top-1/3 -right-48"
        style="animation-delay: -7s"
      />
      <div
        class="orb orb-accent w-[350px] h-[350px] -bottom-32 left-1/4"
        style="animation-delay: -14s"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Ensure minimum content height */
.min-h-screen {
  min-height: 100dvh;
}
</style>
