<script setup lang="ts">
import type { Classroom } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const classrooms = ref<Classroom[]>([])
const selectedClassroom = ref<string>('')
const loading = ref(true)
const loadingRequests = ref(false)
const processing = ref<string | null>(null)

interface PendingRequest {
  id: string
  type: 'PURCHASE' | 'TRANSFER'
  student_name?: string
  from_student_name?: string
  to_student_name?: string
  item_name?: string
  amount: number
  message: string | null
  created_at: string
}

interface PinResetRequest {
  id: string
  status: string
  reason: string
  requested_at: string
  student: { id: string; name: string }
}

const requests = ref<PendingRequest[]>([])
const purchaseCount = ref(0)
const transferCount = ref(0)

// PIN reset requests
const pinRequests = ref<PinResetRequest[]>([])
const pinResetCount = ref(0)
const processingPin = ref<string | null>(null)
const showPinCodeModal = ref(false)
const approvedPinCode = ref('')
const approvedStudentName = ref('')

// Rejection modal
const showRejectModal = ref(false)
const rejectingRequest = ref<PendingRequest | null>(null)
const rejectionReason = ref('')

// Load classrooms
const loadClassrooms = async () => {
  if (!user.value) return

  try {
    const { data, error } = await client
      .from('classrooms')
      .select('*')
      .eq('teacher_id', user.value.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      classrooms.value = data
      if (data.length > 0 && !selectedClassroom.value) {
        selectedClassroom.value = data[0].id
      }
    }
  } catch (e) {
    console.error('Error loading classrooms:', e)
  } finally {
    loading.value = false
  }
}

// Load pending requests
const loadRequests = async () => {
  if (!selectedClassroom.value) return

  loadingRequests.value = true

  try {
    const [requestsRes, pinRes] = await Promise.all([
      $fetch(`/api/teacher/pending-requests?classroom_id=${selectedClassroom.value}`),
      $fetch(`/api/teacher/pin-reset-requests?classroom_id=${selectedClassroom.value}`)
    ])
    requests.value = requestsRes.data?.requests || []
    purchaseCount.value = requestsRes.data?.purchase_count || 0
    transferCount.value = requestsRes.data?.transfer_count || 0

    pinRequests.value = pinRes.data?.pending || []
    pinResetCount.value = pinRes.data?.pending_count || 0
  } catch (e) {
    console.error('Error loading requests:', e)
  } finally {
    loadingRequests.value = false
  }
}

// Handle PIN reset approval
const handlePinApprove = async (request: PinResetRequest) => {
  processingPin.value = request.id

  try {
    const response = await $fetch('/api/teacher/pin-reset-review', {
      method: 'POST',
      body: {
        request_id: request.id,
        action: 'approve',
      },
    })

    // Show the temp code to the teacher
    approvedPinCode.value = response.data?.temp_code || ''
    approvedStudentName.value = response.data?.student_name || ''
    showPinCodeModal.value = true

    // Remove from list
    pinRequests.value = pinRequests.value.filter(r => r.id !== request.id)
    pinResetCount.value--
  } catch (e: any) {
    alert(e.data?.message || 'Error al aprobar')
  } finally {
    processingPin.value = null
  }
}

// Handle PIN reset rejection
const handlePinReject = async (request: PinResetRequest) => {
  if (!confirm(`¿Rechazar la solicitud de ${request.student?.name}?`)) return

  processingPin.value = request.id

  try {
    await $fetch('/api/teacher/pin-reset-review', {
      method: 'POST',
      body: {
        request_id: request.id,
        action: 'reject',
      },
    })

    pinRequests.value = pinRequests.value.filter(r => r.id !== request.id)
    pinResetCount.value--
  } catch (e: any) {
    alert(e.data?.message || 'Error al rechazar')
  } finally {
    processingPin.value = null
  }
}

// Watch classroom selection
watch(selectedClassroom, () => {
  if (selectedClassroom.value) {
    loadRequests()
  }
})

onMounted(() => {
  loadClassrooms()
})

// Auto-refresh every 30 seconds
let refreshInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshInterval = setInterval(() => {
    if (selectedClassroom.value) {
      loadRequests()
    }
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

// Handle approval
const handleApprove = async (request: PendingRequest) => {
  processing.value = request.id

  try {
    await $fetch('/api/teacher/approve-request', {
      method: 'POST',
      body: {
        request_id: request.id,
        request_type: request.type,
        action: 'APPROVE',
      },
    })

    // Remove from list
    requests.value = requests.value.filter(r => r.id !== request.id)
    if (request.type === 'PURCHASE') purchaseCount.value--
    else transferCount.value--
  } catch (e: any) {
    alert(e.data?.message || 'Error al aprobar')
  } finally {
    processing.value = null
  }
}

// Open rejection modal
const openRejectModal = (request: PendingRequest) => {
  rejectingRequest.value = request
  rejectionReason.value = ''
  showRejectModal.value = true
}

// Handle rejection
const handleReject = async () => {
  if (!rejectingRequest.value || !rejectionReason.value.trim()) return

  processing.value = rejectingRequest.value.id
  showRejectModal.value = false

  try {
    await $fetch('/api/teacher/approve-request', {
      method: 'POST',
      body: {
        request_id: rejectingRequest.value.id,
        request_type: rejectingRequest.value.type,
        action: 'REJECT',
        rejection_reason: rejectionReason.value.trim(),
      },
    })

    // Remove from list
    requests.value = requests.value.filter(r => r.id !== rejectingRequest.value!.id)
    if (rejectingRequest.value.type === 'PURCHASE') purchaseCount.value--
    else transferCount.value--
  } catch (e: any) {
    alert(e.data?.message || 'Error al rechazar')
  } finally {
    processing.value = null
    rejectingRequest.value = null
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const selectedClassroomData = computed(() =>
  classrooms.value.find(c => c.id === selectedClassroom.value)
)
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Aprobaciones</h1>
        <p class="text-surface-400">Gestiona las solicitudes de compras y transferencias</p>
      </div>

      <!-- Classroom selector -->
      <select
        v-if="classrooms.length > 0"
        v-model="selectedClassroom"
        class="px-4 py-2 bg-surface-800 border border-surface-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option v-for="c in classrooms" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="glass-card rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span class="text-xl">🛒</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ purchaseCount }}</p>
            <p class="text-sm text-surface-400">Compras</p>
          </div>
        </div>
      </div>

      <div class="glass-card rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span class="text-xl">💸</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ transferCount }}</p>
            <p class="text-sm text-surface-400">Transferencias</p>
          </div>
        </div>
      </div>

      <div class="glass-card rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span class="text-xl">🔐</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ pinResetCount }}</p>
            <p class="text-sm text-surface-400">Reset PIN</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading || loadingRequests" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 rounded-xl skeleton" />
    </div>

    <!-- Empty state -->
    <div v-else-if="requests.length === 0 && pinRequests.length === 0" class="text-center py-16">
      <div class="text-6xl mb-4">✅</div>
      <h2 class="text-xl font-semibold text-white mb-2">Todo al día</h2>
      <p class="text-surface-400">No hay solicitudes pendientes de aprobación</p>
    </div>

    <!-- PIN Reset Requests Section -->
    <div v-if="pinRequests.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🔐</span> Solicitudes de Reset de PIN
      </h2>
      <div class="space-y-3">
        <div
          v-for="request in pinRequests"
          :key="request.id"
          class="glass-card rounded-xl p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300">
                  🔐 Reset PIN
                </span>
                <span class="text-xs text-surface-500">
                  {{ new Date(request.requested_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
              <p class="text-white font-medium">
                {{ request.student?.name }} olvidó su PIN
              </p>
              <p v-if="request.reason" class="text-surface-400 text-sm mt-1">
                "{{ request.reason }}"
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <button
                @click="handlePinApprove(request)"
                :disabled="processingPin === request.id"
                class="px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
              >
                <span v-if="processingPin === request.id">...</span>
                <span v-else>✓ Aprobar</span>
              </button>
              <button
                @click="handlePinReject(request)"
                :disabled="processingPin === request.id"
                class="px-4 py-2 rounded-lg font-semibold text-sm bg-surface-700 hover:bg-red-600 text-surface-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                ✕ Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Separator if both sections have content -->
    <div v-if="pinRequests.length > 0 && requests.length > 0" class="mb-6">
      <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📋</span> Otras Solicitudes
      </h2>
    </div>

    <!-- Requests list -->
    <div v-else class="space-y-4">
      <div
        v-for="request in requests"
        :key="request.id"
        class="glass-card rounded-xl p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <!-- Type badge -->
            <div class="flex items-center gap-2 mb-2">
              <span
                class="px-2 py-1 rounded-lg text-xs font-semibold"
                :class="request.type === 'PURCHASE'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-blue-500/20 text-blue-300'"
              >
                {{ request.type === 'PURCHASE' ? '🛒 Compra' : '💸 Transferencia' }}
              </span>
              <span class="text-xs text-surface-500">{{ formatDate(request.created_at) }}</span>
            </div>

            <!-- Details -->
            <div v-if="request.type === 'PURCHASE'" class="mb-2">
              <p class="text-white font-medium">
                {{ request.student_name }} quiere comprar
              </p>
              <p class="text-lg font-bold text-primary-400">
                {{ request.item_name }}
                <span class="text-surface-400 font-normal">por</span>
                {{ request.amount }} {{ selectedClassroomData?.currency_symbol }}
              </p>
            </div>

            <div v-else class="mb-2">
              <p class="text-white font-medium">
                {{ request.from_student_name }} → {{ request.to_student_name }}
              </p>
              <p class="text-lg font-bold text-blue-400">
                {{ request.amount }} {{ selectedClassroomData?.currency_symbol }}
              </p>
            </div>

            <!-- Message -->
            <div v-if="request.message" class="bg-surface-800/50 rounded-lg p-3 mt-2">
              <p class="text-xs text-surface-500 mb-1">Mensaje:</p>
              <p class="text-surface-300 text-sm">{{ request.message }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <button
              @click="handleApprove(request)"
              :disabled="processing === request.id"
              class="px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
            >
              <span v-if="processing === request.id">...</span>
              <span v-else>✓ Aprobar</span>
            </button>
            <button
              @click="openRejectModal(request)"
              :disabled="processing === request.id"
              class="px-4 py-2 rounded-lg font-semibold text-sm bg-surface-700 hover:bg-red-600 text-surface-300 hover:text-white disabled:opacity-50 transition-colors"
            >
              ✕ Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRejectModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="showRejectModal = false"
        >
          <div class="w-full max-w-md glass-card rounded-2xl p-6">
            <h2 class="text-xl font-bold text-white mb-4">Rechazar solicitud</h2>

            <p class="text-surface-400 mb-4">
              Indica la razón por la que rechazas esta solicitud. El estudiante verá este mensaje.
            </p>

            <textarea
              v-model="rejectionReason"
              placeholder="Ej: No cumple con los requisitos..."
              rows="3"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
            />

            <div class="flex gap-3">
              <button
                @click="showRejectModal = false"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-surface-700 text-surface-300 hover:bg-surface-600"
              >
                Cancelar
              </button>
              <button
                @click="handleReject"
                :disabled="!rejectionReason.trim()"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- PIN Code Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showPinCodeModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="showPinCodeModal = false"
        >
          <div class="w-full max-w-md glass-card rounded-2xl p-6 text-center">
            <div class="text-5xl mb-4">✅</div>
            <h2 class="text-xl font-bold text-white mb-2">Solicitud Aprobada</h2>

            <p class="text-surface-400 mb-4">
              Dale este código temporal a <span class="text-white font-medium">{{ approvedStudentName }}</span>:
            </p>

            <div class="bg-surface-800 rounded-xl p-4 mb-4">
              <p class="text-4xl font-mono font-bold text-primary-400 tracking-wider">
                {{ approvedPinCode }}
              </p>
            </div>

            <p class="text-surface-500 text-sm mb-6">
              El estudiante tiene 24 horas para usar este código y crear un nuevo PIN.
            </p>

            <button
              @click="showPinCodeModal = false"
              class="w-full px-4 py-3 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-500"
            >
              Entendido
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
