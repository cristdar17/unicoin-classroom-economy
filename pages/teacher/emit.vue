<script setup lang="ts">
import type { Classroom, StudentWithWallet } from '~/types'
import { EMISSION_REASONS } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

// State
const classrooms = ref<Classroom[]>([])
const students = ref<StudentWithWallet[]>([])
const selectedClassroom = ref<string>('')
const selectedStudents = ref<string[]>([])
const loading = ref(true)
const loadingStudents = ref(false)
const emitting = ref(false)
const success = ref('')
const error = ref('')

const form = reactive({
  amount: '10',
  reason_id: 'participation',
  custom_reason: '',
})

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

// Load students when classroom changes
watch(selectedClassroom, async (classroomId) => {
  if (!classroomId) {
    students.value = []
    return
  }

  loadingStudents.value = true
  selectedStudents.value = []

  try {
    const response = await $fetch(`/api/classroom/${classroomId}/students`)
    students.value = response.data || []
  } catch (e) {
    console.error('Error loading students:', e)
  } finally {
    loadingStudents.value = false
  }
})

const selectedClassroomData = computed(() =>
  classrooms.value.find(c => c.id === selectedClassroom.value)
)

const selectedReasonLabel = computed(() => {
  const reason = EMISSION_REASONS.find(r => r.id === form.reason_id)
  if (form.reason_id === 'custom') return form.custom_reason || 'Otro'
  return reason?.label || ''
})

const toggleStudent = (studentId: string) => {
  const index = selectedStudents.value.indexOf(studentId)
  if (index === -1) {
    selectedStudents.value.push(studentId)
  } else {
    selectedStudents.value.splice(index, 1)
  }
}

const selectAll = () => {
  if (selectedStudents.value.length === students.value.length) {
    selectedStudents.value = []
  } else {
    selectedStudents.value = students.value.map(s => s.id)
  }
}

const handleEmit = async () => {
  if (selectedStudents.value.length === 0) {
    error.value = 'Selecciona al menos un estudiante'
    return
  }

  const amount = parseInt(form.amount)
  if (!amount || amount <= 0) {
    error.value = 'La cantidad debe ser mayor a 0'
    return
  }

  emitting.value = true
  error.value = ''
  success.value = ''

  try {
    const reason = form.reason_id === 'custom' ? form.custom_reason : selectedReasonLabel.value

    const response = await $fetch('/api/transactions/emit', {
      method: 'POST',
      body: {
        classroom_id: selectedClassroom.value,
        student_ids: selectedStudents.value,
        amount,
        reason,
        reason_id: form.reason_id !== 'custom' ? form.reason_id : undefined,
      },
    })

    if (response.error) throw new Error(response.error)

    const symbol = selectedClassroomData.value?.currency_symbol || '🪙'
    const bonusInfo = response.data?.total_bonuses > 0
      ? ` (+${response.data.total_bonuses} ${symbol} bonus por rachas)`
      : ''
    success.value = `¡Emitiste ${response.data?.total_emitted || amount} ${symbol} a ${selectedStudents.value.length} estudiante(s)!${bonusInfo}`

    // Update local balances with actual amounts from response
    if (response.data?.student_results) {
      for (const result of response.data.student_results) {
        const student = students.value.find(s => s.id === result.student_id)
        if (student) {
          student.wallet.balance += result.total_received
        }
      }
    } else {
      // Fallback to simple update
      for (const student of students.value) {
        if (selectedStudents.value.includes(student.id)) {
          student.wallet.balance += amount
        }
      }
    }

    selectedStudents.value = []

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al emitir'
  } finally {
    emitting.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Emitir Monedas</h1>
    <p class="text-surface-400 mb-6">Recompensa a tus estudiantes</p>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else>
      <!-- No classrooms -->
      <div v-if="classrooms.length === 0" class="text-center py-12">
        <p class="text-surface-400 mb-4">No tienes aulas. Crea una primero.</p>
        <NuxtLink
          to="/teacher"
          class="text-primary-400 hover:text-primary-300"
        >
          Ir al dashboard
        </NuxtLink>
      </div>

      <div v-else class="max-w-2xl">
        <!-- Select classroom -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-surface-300 mb-1">
            Aula
          </label>
          <select
            v-model="selectedClassroom"
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>Selecciona un aula</option>
            <option
              v-for="classroom in classrooms"
              :key="classroom.id"
              :value="classroom.id"
            >
              {{ classroom.name }} ({{ classroom.currency_symbol }})
            </option>
          </select>
        </div>

        <template v-if="selectedClassroom">
          <!-- Amount and reason -->
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-1">
                Cantidad
              </label>
              <div class="relative">
                <input
                  v-model="form.amount"
                  type="number"
                  min="1"
                  class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">
                  {{ selectedClassroomData?.currency_symbol }}
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-300 mb-1">
                Razón
              </label>
              <select
                v-model="form.reason_id"
                class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option
                  v-for="reason in EMISSION_REASONS"
                  :key="reason.id"
                  :value="reason.id"
                >
                  {{ reason.icon }} {{ reason.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Custom reason input -->
          <div v-if="form.reason_id === 'custom'" class="mb-6">
            <input
              v-model="form.custom_reason"
              type="text"
              placeholder="Especifica la razón..."
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- Students list -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-surface-300">
                Estudiantes ({{ selectedStudents.length }} seleccionados)
              </label>
              <button
                @click="selectAll"
                class="text-primary-400 hover:text-primary-300 text-sm"
              >
                {{ selectedStudents.length === students.length ? 'Deseleccionar' : 'Seleccionar' }} todos
              </button>
            </div>

            <div v-if="loadingStudents" class="text-surface-400 py-4">
              Cargando estudiantes...
            </div>

            <div v-else-if="students.length === 0" class="text-surface-400 py-4">
              No hay estudiantes en este aula todavía
            </div>

            <div v-else class="bg-surface-800 rounded-xl divide-y divide-surface-700 max-h-80 overflow-y-auto">
              <button
                v-for="student in students"
                :key="student.id"
                type="button"
                @click="toggleStudent(student.id)"
                class="w-full flex items-center gap-4 p-4 hover:bg-surface-700 transition-colors text-left"
              >
                <div
                  class="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors"
                  :class="selectedStudents.includes(student.id)
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-surface-500'"
                >
                  <span v-if="selectedStudents.includes(student.id)" class="text-white text-sm">✓</span>
                </div>
                <!-- Student photo or initials -->
                <div
                  v-if="student.photo_url"
                  class="w-9 h-9 rounded-full overflow-hidden border-2 border-surface-600 flex-shrink-0"
                >
                  <img
                    :src="student.photo_url"
                    :alt="student.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0 border-2 border-surface-600"
                >
                  <span class="text-xs font-bold text-white">
                    {{ student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
                  </span>
                </div>
                <div class="flex-1">
                  <div class="font-medium">{{ student.name }}</div>
                </div>
                <div class="text-surface-400 text-sm">
                  {{ student.wallet.balance.toLocaleString() }} {{ selectedClassroomData?.currency_symbol }}
                </div>
              </button>
            </div>
          </div>

          <!-- Success message -->
          <div v-if="success" class="bg-accent-900/50 border border-accent-500 text-accent-200 px-4 py-3 rounded-xl text-sm mb-4">
            {{ success }}
          </div>

          <!-- Error message -->
          <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm mb-4">
            {{ error }}
          </div>

          <!-- Emit button -->
          <button
            @click="handleEmit"
            :disabled="emitting || selectedStudents.length === 0"
            class="w-full bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors"
          >
            <span v-if="emitting">Emitiendo...</span>
            <span v-else>
              Emitir {{ form.amount }} {{ selectedClassroomData?.currency_symbol }}
              a {{ selectedStudents.length }} estudiante(s)
            </span>
          </button>
        </template>
      </div>
    </template>
  </div>
</template>
