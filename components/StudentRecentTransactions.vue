<script setup lang="ts">
import type { TransactionWithDetails } from '~/types'

const props = defineProps<{
  walletId: string
  limit?: number
}>()

const { classroom } = useStudentSession()

const transactions = ref<TransactionWithDetails[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await $fetch(`/api/transactions/history?wallet_id=${props.walletId}&limit=${props.limit || 10}`)
    transactions.value = response.data || []
  } catch (e) {
    console.error('Error loading transactions:', e)
  } finally {
    loading.value = false
  }
})

const getTypeConfig = (type: string, isIncoming: boolean) => {
  const configs: Record<string, { icon: string; bg: string; label: string }> = {
    EMISSION: {
      icon: '💰',
      bg: 'from-emerald-500/20 to-green-500/20',
      label: 'Recompensa'
    },
    TRANSFER_IN: {
      icon: '📥',
      bg: 'from-blue-500/20 to-cyan-500/20',
      label: 'Recibido'
    },
    TRANSFER_OUT: {
      icon: '📤',
      bg: 'from-orange-500/20 to-red-500/20',
      label: 'Enviado'
    },
    PURCHASE: {
      icon: '🛍️',
      bg: 'from-purple-500/20 to-pink-500/20',
      label: 'Compra'
    },
    REFUND: {
      icon: '↩️',
      bg: 'from-surface-500/20 to-surface-400/20',
      label: 'Reembolso'
    },
  }

  if (type === 'TRANSFER') {
    return isIncoming ? configs.TRANSFER_IN : configs.TRANSFER_OUT
  }

  return configs[type] || { icon: '💫', bg: 'from-surface-500/20 to-surface-400/20', label: type }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Ahora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`

  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

const isIncoming = (tx: TransactionWithDetails) => tx.to_wallet_id === props.walletId
</script>

<template>
  <div>
    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-4 rounded-2xl bg-surface-800/50">
        <div class="w-12 h-12 rounded-xl bg-surface-700 animate-pulse" />
        <div class="flex-1">
          <div class="h-4 w-24 bg-surface-700 rounded animate-pulse mb-2" />
          <div class="h-3 w-32 bg-surface-700/50 rounded animate-pulse" />
        </div>
        <div class="h-5 w-16 bg-surface-700 rounded animate-pulse" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="transactions.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
        <span class="text-3xl opacity-50">📭</span>
      </div>
      <p class="text-surface-400">Sin transacciones aún</p>
      <p class="text-surface-500 text-sm mt-1">Tus movimientos aparecerán aquí</p>
    </div>

    <!-- Transactions list -->
    <div v-else class="space-y-2">
      <div
        v-for="tx in transactions"
        :key="tx.id"
        class="transaction-item group"
      >
        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br"
          :class="getTypeConfig(tx.type, isIncoming(tx)).bg"
        >
          <span class="text-xl">{{ getTypeConfig(tx.type, isIncoming(tx)).icon }}</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-white truncate">
              {{ getTypeConfig(tx.type, isIncoming(tx)).label }}
            </span>
            <span class="text-surface-500 text-xs">{{ formatDate(tx.created_at) }}</span>
          </div>
          <p class="text-surface-400 text-sm truncate">
            <template v-if="tx.type === 'TRANSFER'">
              {{ isIncoming(tx) ? `De ${tx.from_student_name}` : `Para ${tx.to_student_name}` }}
            </template>
            <template v-else>
              {{ tx.reason || 'Sin descripción' }}
            </template>
          </p>
        </div>

        <!-- Amount -->
        <div class="text-right">
          <span
            class="text-lg font-bold"
            :class="isIncoming(tx) ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ isIncoming(tx) ? '+' : '-' }}{{ tx.amount.toLocaleString() }}
          </span>
          <span class="text-surface-400 text-sm ml-1">{{ classroom?.currency_symbol }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transaction-item {
  @apply flex items-center gap-4 p-4 rounded-2xl;
  @apply bg-surface-800/30 hover:bg-surface-800/50;
  @apply transition-all duration-200;
  @apply active:scale-[0.98];
}
</style>
