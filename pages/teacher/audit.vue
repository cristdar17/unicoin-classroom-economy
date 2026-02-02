<script setup lang="ts">
import type { Classroom, TransactionWithDetails } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const classrooms = ref<Classroom[]>([])
const transactions = ref<TransactionWithDetails[]>([])
const selectedClassroom = ref<string>('')
const loading = ref(true)
const loadingTransactions = ref(false)

const filterType = ref<string>('all')

// Load classrooms
onMounted(async () => {
  if (!user.value) return

  try {
    const { data } = await client
      .from('classrooms')
      .select('*')
      .eq('teacher_id', user.value.id)
      .order('name')

    classrooms.value = data || []

    if (classrooms.value.length === 1) {
      selectedClassroom.value = classrooms.value[0].id
    }
  } catch (e) {
    console.error('Error loading classrooms:', e)
  } finally {
    loading.value = false
  }
})

// Load transactions when classroom changes
watch(selectedClassroom, async (classroomId) => {
  if (!classroomId) {
    transactions.value = []
    return
  }

  loadingTransactions.value = true

  try {
    const response = await $fetch(`/api/transactions/history?classroom_id=${classroomId}&limit=100`)
    transactions.value = response.data || []
  } catch (e) {
    console.error('Error loading transactions:', e)
  } finally {
    loadingTransactions.value = false
  }
})

const filteredTransactions = computed(() => {
  if (filterType.value === 'all') return transactions.value
  return transactions.value.filter(t => t.type === filterType.value)
})

const selectedClassroomData = computed(() =>
  classrooms.value.find(c => c.id === selectedClassroom.value)
)

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    EMISSION: 'Emisión',
    TRANSFER: 'Transferencia',
    PURCHASE: 'Compra',
    REFUND: 'Reembolso',
    COLLECTIVE_CONTRIBUTION: 'Contribución',
  }
  return labels[type] || type
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    EMISSION: 'bg-accent-600/20 text-accent-300',
    TRANSFER: 'bg-primary-600/20 text-primary-300',
    PURCHASE: 'bg-amber-600/20 text-amber-300',
    REFUND: 'bg-surface-600/20 text-surface-300',
    COLLECTIVE_CONTRIBUTION: 'bg-purple-600/20 text-purple-300',
  }
  return colors[type] || 'bg-surface-600/20 text-surface-300'
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Auditoría</h1>
    <p class="text-surface-400 mb-6">Historial de todas las transacciones</p>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else>
      <div v-if="classrooms.length === 0" class="text-center py-12">
        <p class="text-surface-400">No tienes aulas.</p>
      </div>

      <div v-else>
        <!-- Filters -->
        <div class="flex flex-col md:flex-row gap-4 mb-6">
          <select
            v-model="selectedClassroom"
            class="px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>Selecciona un aula</option>
            <option
              v-for="classroom in classrooms"
              :key="classroom.id"
              :value="classroom.id"
            >
              {{ classroom.name }}
            </option>
          </select>

          <select
            v-model="filterType"
            :disabled="!selectedClassroom"
            class="px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="all">Todos los tipos</option>
            <option value="EMISSION">Emisiones</option>
            <option value="TRANSFER">Transferencias</option>
            <option value="PURCHASE">Compras</option>
          </select>
        </div>

        <!-- Transactions table -->
        <div v-if="selectedClassroom">
          <div v-if="loadingTransactions" class="text-surface-400 py-4">
            Cargando transacciones...
          </div>

          <div v-else-if="filteredTransactions.length === 0" class="text-center py-12 text-surface-400">
            No hay transacciones
          </div>

          <div v-else class="bg-surface-800 rounded-xl overflow-hidden">
            <!-- Desktop table -->
            <table class="w-full hidden md:table">
              <thead class="bg-surface-700">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-medium text-surface-300">Fecha</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-surface-300">Tipo</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-surface-300">De</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-surface-300">Para</th>
                  <th class="px-4 py-3 text-right text-sm font-medium text-surface-300">Cantidad</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-surface-300">Razón</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-700">
                <tr v-for="tx in filteredTransactions" :key="tx.id">
                  <td class="px-4 py-3 text-sm text-surface-400">{{ formatDate(tx.created_at) }}</td>
                  <td class="px-4 py-3">
                    <span :class="getTypeColor(tx.type)" class="text-xs px-2 py-1 rounded">
                      {{ getTypeLabel(tx.type) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    {{ tx.from_student_name || (tx.type === 'EMISSION' ? 'Sistema' : '-') }}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    {{ tx.to_student_name || (tx.type === 'PURCHASE' ? 'Mercado' : '-') }}
                  </td>
                  <td class="px-4 py-3 text-right font-mono">
                    <span :class="tx.type === 'EMISSION' ? 'text-accent-400' : ''">
                      {{ tx.amount.toLocaleString() }} {{ selectedClassroomData?.currency_symbol }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-surface-400 max-w-xs truncate">
                    {{ tx.reason }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Mobile list -->
            <div class="md:hidden divide-y divide-surface-700">
              <div v-for="tx in filteredTransactions" :key="tx.id" class="p-4">
                <div class="flex items-center justify-between mb-2">
                  <span :class="getTypeColor(tx.type)" class="text-xs px-2 py-1 rounded">
                    {{ getTypeLabel(tx.type) }}
                  </span>
                  <span class="text-surface-400 text-xs">{{ formatDate(tx.created_at) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm">
                    <span class="text-surface-400">
                      {{ tx.from_student_name || 'Sistema' }}
                    </span>
                    <span class="mx-2">→</span>
                    <span>{{ tx.to_student_name || 'Mercado' }}</span>
                  </div>
                  <div class="font-mono font-semibold">
                    {{ tx.amount }} {{ selectedClassroomData?.currency_symbol }}
                  </div>
                </div>
                <div v-if="tx.reason" class="text-xs text-surface-500 mt-1 truncate">
                  {{ tx.reason }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
