<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

const { wallet, classroom, loading } = useStudentSession()
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-6">Mi Wallet</h1>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else-if="wallet && classroom">
      <!-- Balance -->
      <div class="bg-surface-800 rounded-xl p-4 mb-6">
        <div class="text-surface-400 text-sm">Balance actual</div>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-3xl font-bold">{{ wallet.balance.toLocaleString() }}</span>
          <span class="text-xl">{{ classroom.currency_symbol }}</span>
        </div>
      </div>

      <!-- Transaction history -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Historial de transacciones</h2>
        <StudentRecentTransactions :wallet-id="wallet.id" :limit="50" />
      </div>
    </template>
  </div>
</template>
