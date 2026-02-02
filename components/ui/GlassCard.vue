<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'primary' | 'success' | 'warning'
  padding?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div
    class="glass-card"
    :class="[
      variant === 'primary' && 'glass-primary',
      variant === 'success' && 'glass-success',
      variant === 'warning' && 'glass-warning',
      padding === 'sm' && 'p-3',
      padding === 'lg' && 'p-6',
      !padding || padding === 'md' && 'p-4',
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-card {
  @apply relative overflow-hidden rounded-2xl;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow:
    0 4px 24px -1px rgba(0, 0, 0, 0.2),
    0 0 1px 0 rgba(148, 163, 184, 0.1) inset;
}

.glass-primary {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.2) 100%);
  border-color: rgba(129, 140, 248, 0.2);
}

.glass-success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%);
  border-color: rgba(52, 211, 153, 0.2);
}

.glass-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.2) 100%);
  border-color: rgba(251, 191, 36, 0.2);
}
</style>
