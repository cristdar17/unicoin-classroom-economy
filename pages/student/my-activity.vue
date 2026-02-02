<script setup lang="ts">
import { STREAK_TYPES } from '~/types'

definePageMeta({
  layout: 'student',
})

const { student, classroom, loading: sessionLoading } = useStudentSession()

const loading = ref(true)
const requests = ref<any[]>([])
const pendingCount = ref(0)
const streaks = ref<any[]>([])
const cancelling = ref<string | null>(null)

const loadData = async () => {
  if (!classroom.value) return

  const studentToken = useStudentToken()

  try {
    // Load pending requests
    const requestsResponse = await $fetch('/api/student/my-requests', {
      headers: { Authorization: `Bearer ${studentToken.value}` },
    })
    requests.value = requestsResponse.data?.requests || []
    pendingCount.value = requestsResponse.data?.pending_count || 0

    // Load streaks
    const streaksResponse = await $fetch(`/api/student/my-streaks?classroom_id=${classroom.value.id}`, {
      headers: { Authorization: `Bearer ${studentToken.value}` },
    }).catch(() => ({ data: { streaks: [] } }))

    streaks.value = streaksResponse.data?.streaks || []
  } catch (e) {
    console.error('Error loading data:', e)
  } finally {
    loading.value = false
  }
}

watch(classroom, () => {
  if (classroom.value) {
    loadData()
  }
}, { immediate: true })

const cancelRequest = async (request: any) => {
  if (!confirm('¿Seguro que deseas cancelar esta solicitud?')) return

  cancelling.value = request.id
  const studentToken = useStudentToken()

  try {
    await $fetch('/api/student/cancel-request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken.value}` },
      body: {
        request_id: request.id,
        request_type: request.type,
      },
    })

    // Remove from list
    requests.value = requests.value.filter(r => r.id !== request.id)
    pendingCount.value--
  } catch (e: any) {
    alert(e.data?.message || 'Error al cancelar')
  } finally {
    cancelling.value = null
  }
}

const getStreakInfo = (type: string) => {
  return STREAK_TYPES.find(s => s.id === type) || { label: type, icon: '📊', description: '' }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="p-4 pb-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/student" class="text-surface-400 hover:text-white">
        ← Volver
      </NuxtLink>
    </div>

    <h1 class="text-2xl font-bold text-white mb-2">Mi Actividad</h1>
    <p class="text-surface-400 mb-6">Solicitudes pendientes y rachas</p>

    <!-- Loading -->
    <div v-if="sessionLoading || loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-2xl skeleton" />
    </div>

    <template v-else>
      <!-- Pending Requests Section -->
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>⏳</span>
          Solicitudes Pendientes
          <span v-if="pendingCount > 0" class="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-sm">
            {{ pendingCount }}
          </span>
        </h2>

        <div v-if="requests.length === 0" class="glass-card rounded-xl p-6 text-center">
          <p class="text-surface-400">No tienes solicitudes recientes</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="request in requests"
            :key="request.id"
            class="glass-card rounded-xl p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-semibold"
                    :class="{
                      'bg-amber-500/20 text-amber-300': request.status === 'PENDING',
                      'bg-red-500/20 text-red-300': request.status === 'REJECTED',
                    }"
                  >
                    {{ request.status === 'PENDING' ? '⏳ Pendiente' : '❌ Rechazada' }}
                  </span>
                  <span class="text-xs text-surface-500">{{ formatDate(request.created_at) }}</span>
                </div>

                <p class="font-medium text-white">{{ request.description }}</p>
                <p class="text-surface-400">
                  {{ request.amount }} {{ classroom?.currency_symbol }}
                </p>

                <p v-if="request.message" class="text-sm text-surface-500 mt-1">
                  "{{ request.message }}"
                </p>

                <p v-if="request.rejection_reason" class="text-sm text-red-400 mt-2">
                  Razón: {{ request.rejection_reason }}
                </p>
              </div>

              <!-- Cancel button -->
              <div v-if="request.can_cancel" class="flex flex-col items-end gap-1">
                <button
                  @click="cancelRequest(request)"
                  :disabled="cancelling === request.id"
                  class="px-3 py-1.5 rounded-lg text-sm bg-surface-700 hover:bg-red-600 text-surface-300 hover:text-white transition-colors"
                >
                  {{ cancelling === request.id ? '...' : 'Cancelar' }}
                </button>
                <span class="text-xs text-surface-500">
                  {{ request.minutes_left }} min restantes
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Streaks Section -->
      <section>
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔥</span>
          Mis Rachas
        </h2>

        <div v-if="streaks.length === 0" class="glass-card rounded-xl p-6 text-center">
          <p class="text-surface-400">Aún no tienes rachas. ¡Participa en clase para empezar!</p>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="streak in streaks"
            :key="streak.streak_type"
            class="glass-card rounded-xl p-4"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">{{ getStreakInfo(streak.streak_type).icon }}</span>
              <span class="font-medium text-white text-sm">{{ getStreakInfo(streak.streak_type).label }}</span>
            </div>

            <div class="flex items-baseline gap-1 mb-1">
              <span class="text-3xl font-bold text-white">{{ streak.current_streak }}</span>
              <span class="text-surface-400 text-sm">actual</span>
            </div>

            <div class="flex justify-between text-xs text-surface-500">
              <span>Mejor: {{ streak.best_streak }}</span>
              <span>Total: {{ streak.total_count }}</span>
            </div>

            <!-- Progress to next milestone -->
            <div v-if="streak.next_milestone" class="mt-2">
              <div class="flex justify-between text-xs text-surface-400 mb-1">
                <span>Próximo: {{ streak.next_milestone.reward_name }}</span>
                <span>+{{ streak.next_milestone.reward_amount }}</span>
              </div>
              <div class="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  :style="{ width: ((streak.current_streak / streak.next_milestone.milestone) * 100) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
