<script setup lang="ts">
import type { StudentWithWallet } from '~/types'

definePageMeta({
  layout: 'student',
})

const { student, wallet, classroom, loading: sessionLoading } = useStudentSession()

const loading = ref(false)
const success = ref(false)
const error = ref('')

const classmates = ref<StudentWithWallet[]>([])
const loadingClassmates = ref(true)

const form = reactive({
  to_student_id: '',
  amount: '',
  message: '',
})

// Load classmates
onMounted(async () => {
  if (!classroom.value) return

  try {
    const response = await $fetch(`/api/classroom/${classroom.value.id}/students`)
    // Filter out self
    classmates.value = (response.data || []).filter(
      (s: StudentWithWallet) => s.id !== student.value?.id
    )
  } catch (e) {
    console.error('Error loading classmates:', e)
  } finally {
    loadingClassmates.value = false
  }
})

const selectedStudent = computed(() =>
  classmates.value.find(s => s.id === form.to_student_id)
)

const canTransfer = computed(() => {
  const amount = parseInt(form.amount)
  return (
    form.to_student_id &&
    amount > 0 &&
    amount <= (wallet.value?.balance || 0) &&
    form.message.trim().length >= 3
  )
})

const handleTransfer = async () => {
  if (!canTransfer.value) return

  error.value = ''
  loading.value = true

  const studentToken = useStudentToken()

  try {
    const response = await $fetch('/api/transactions/transfer', {
      method: 'POST',
      body: {
        to_student_id: form.to_student_id,
        amount: parseInt(form.amount),
        message: form.message.trim(),
      },
      headers: {
        Authorization: `Bearer ${studentToken.value}`,
      },
    })

    if (response.error) {
      throw new Error(response.error)
    }

    success.value = true
    form.to_student_id = ''
    form.amount = ''
    form.message = ''

    // Go back after showing pending message
    setTimeout(() => {
      success.value = false
      navigateTo('/student')
    }, 3000)
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al transferir'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-2">Enviar {{ classroom?.currency_name }}</h1>
    <p class="text-surface-400 mb-6">Transfiere a un compañero de clase</p>

    <div v-if="sessionLoading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else-if="wallet && classroom">
      <!-- Pending message (was success) -->
      <div v-if="success" class="bg-amber-900/50 border border-amber-500 rounded-xl p-6 text-center">
        <div class="text-4xl mb-2">⏳</div>
        <div class="text-amber-200 font-semibold mb-1">Solicitud enviada</div>
        <div class="text-amber-300/70 text-sm">Tu transferencia está pendiente de aprobación por el docente</div>
      </div>

      <!-- Transfer form -->
      <form v-else @submit.prevent="handleTransfer" class="space-y-4">
        <!-- Info banner -->
        <div class="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200">
          <span class="font-semibold">Nota:</span> Las transferencias requieren aprobación del docente antes de completarse.
        </div>

        <!-- Current balance -->
        <div class="bg-surface-800 rounded-xl p-4">
          <div class="text-surface-400 text-sm">Tu balance</div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold">{{ wallet.balance.toLocaleString() }}</span>
            <span>{{ classroom.currency_symbol }}</span>
          </div>
        </div>

        <!-- Select recipient -->
        <div>
          <label class="block text-sm font-medium text-surface-300 mb-1">
            Enviar a
          </label>
          <select
            v-model="form.to_student_id"
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>Selecciona un compañero</option>
            <option
              v-for="classmate in classmates"
              :key="classmate.id"
              :value="classmate.id"
            >
              {{ classmate.name }}
            </option>
          </select>
          <p v-if="loadingClassmates" class="text-surface-500 text-sm mt-1">
            Cargando compañeros...
          </p>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-surface-300 mb-1">
            Cantidad
          </label>
          <div class="relative">
            <input
              v-model="form.amount"
              type="number"
              min="1"
              :max="wallet.balance"
              placeholder="0"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-xl placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">
              {{ classroom.currency_symbol }}
            </div>
          </div>
          <p v-if="parseInt(form.amount) > wallet.balance" class="text-red-400 text-sm mt-1">
            No tienes suficiente balance
          </p>
        </div>

        <!-- Message (REQUIRED) -->
        <div>
          <label class="block text-sm font-medium text-surface-300 mb-1">
            Razón de la transferencia <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="form.message"
            placeholder="Ej: Pago por ayuda en el taller..."
            rows="2"
            maxlength="200"
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p class="text-surface-500 text-xs mt-1">
            El docente verá esta explicación. Mínimo 3 caracteres.
          </p>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="!canTransfer || loading"
          class="w-full bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          <span v-if="loading">Enviando solicitud...</span>
          <span v-else>
            Enviar {{ form.amount || '0' }} {{ classroom.currency_symbol }}
            <span v-if="selectedStudent"> a {{ selectedStudent.name.split(' ')[0] }}</span>
          </span>
        </button>
      </form>
    </template>
  </div>
</template>
