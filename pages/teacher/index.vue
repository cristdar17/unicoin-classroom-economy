<script setup lang="ts">
import type { ClassroomWithStats } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const classrooms = ref<ClassroomWithStats[]>([])
const loading = ref(true)
const showCreateModal = ref(false)

// Load classrooms
const loadClassrooms = async () => {
  if (!user.value) return

  loading.value = true
  try {
    const { data, error } = await client
      .from('classrooms')
      .select(`
        *,
        students(count),
        wallets(balance)
      `)
      .eq('teacher_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    classrooms.value = (data || []).map(c => ({
      ...c,
      student_count: c.students?.[0]?.count || 0,
      total_supply: c.wallets?.reduce((sum: number, w: any) => sum + (w.balance || 0), 0) || 0,
    }))
  } catch (e) {
    console.error('Error loading classrooms:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadClassrooms)

// Create classroom form
const createForm = reactive({
  name: '',
  currency_name: 'Monedas',
  currency_symbol: '🪙',
  treasury_total: 10000,
})

const creating = ref(false)
const createError = ref('')

const handleCreate = async () => {
  if (!createForm.name.trim()) {
    createError.value = 'El nombre es requerido'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    const response = await $fetch('/api/classroom/create', {
      method: 'POST',
      body: createForm,
    })

    if (response.error) throw new Error(response.error)

    showCreateModal.value = false
    createForm.name = ''
    createForm.currency_name = 'Monedas'
    createForm.currency_symbol = '🪙'
    createForm.treasury_total = 10000

    await loadClassrooms()
  } catch (e: any) {
    createError.value = e.data?.message || e.message || 'Error al crear'
  } finally {
    creating.value = false
  }
}

const symbolOptions = ['🪙', '⭐', '💎', '🔥', '💰', '🎯', '🏆', '💫']
const treasuryPresets = [5000, 10000, 20000, 50000]

const getTreasuryPercentage = (classroom: any) => {
  if (!classroom.treasury_total) return 100
  return Math.round((classroom.treasury_remaining / classroom.treasury_total) * 100)
}

const getTreasuryColor = (percentage: number) => {
  if (percentage > 50) return 'text-emerald-400'
  if (percentage > 20) return 'text-amber-400'
  return 'text-red-400'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-white">Mis Aulas</h1>
        <p class="text-surface-400 mt-1">Gestiona tus economías de clase</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-medium px-5 py-3 rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
      >
        <span class="text-lg">+</span>
        Nueva Aula
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-48 rounded-2xl bg-surface-800/50 animate-pulse" />
    </div>

    <!-- Empty state -->
    <div v-else-if="classrooms.length === 0" class="text-center py-20">
      <div class="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
        <span class="text-5xl">📚</span>
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">No tienes aulas todavía</h2>
      <p class="text-surface-400 mb-8 max-w-sm mx-auto">
        Crea tu primera aula para empezar a gamificar la economía de tu clase
      </p>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
      >
        <span class="text-xl">🚀</span>
        Crear mi primera aula
      </button>
    </div>

    <!-- Classrooms grid -->
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="classroom in classrooms"
        :key="classroom.id"
        :to="`/teacher/classroom/${classroom.id}`"
        class="classroom-card group"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
              {{ classroom.currency_symbol }}
            </div>
            <div>
              <h3 class="font-semibold text-white group-hover:text-primary-400 transition-colors">
                {{ classroom.name }}
              </h3>
              <p class="text-surface-400 text-sm">{{ classroom.currency_name }}</p>
            </div>
          </div>
          <div class="px-3 py-1.5 rounded-lg bg-surface-700/50 text-xs font-mono text-surface-300">
            {{ classroom.code }}
          </div>
        </div>

        <!-- Treasury indicator -->
        <div class="mb-4 p-3 rounded-xl bg-surface-900/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-surface-400">Bolsa del curso</span>
            <span
              class="text-xs font-bold"
              :class="getTreasuryColor(getTreasuryPercentage(classroom))"
            >
              {{ getTreasuryPercentage(classroom) }}%
            </span>
          </div>
          <div class="h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="[
                getTreasuryPercentage(classroom) > 50 && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
                getTreasuryPercentage(classroom) <= 50 && getTreasuryPercentage(classroom) > 20 && 'bg-gradient-to-r from-amber-500 to-amber-400',
                getTreasuryPercentage(classroom) <= 20 && 'bg-gradient-to-r from-red-500 to-red-400',
              ]"
              :style="{ width: getTreasuryPercentage(classroom) + '%' }"
            />
          </div>
          <div class="flex justify-between mt-2 text-xs">
            <span class="text-surface-500">
              {{ (classroom.treasury_remaining || 0).toLocaleString() }} disponibles
            </span>
            <span class="text-surface-500">
              de {{ (classroom.treasury_total || 0).toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-surface-900/30">
            <div class="text-2xl font-bold text-white">{{ classroom.student_count }}</div>
            <div class="text-xs text-surface-400">Estudiantes</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-900/30">
            <div class="text-2xl font-bold text-white">{{ classroom.total_supply.toLocaleString() }}</div>
            <div class="text-xs text-surface-400">En circulación</div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showCreateModal = false"
        />

        <!-- Modal -->
        <div class="relative w-full max-w-md bg-surface-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
          <h2 class="text-2xl font-bold text-white mb-6">Crear nueva aula</h2>

          <form @submit.prevent="handleCreate" class="space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Nombre del aula
              </label>
              <input
                v-model="createForm.name"
                type="text"
                placeholder="Ej: Economía 101 - 2024"
                class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <!-- Currency name -->
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Nombre de la moneda
              </label>
              <input
                v-model="createForm.currency_name"
                type="text"
                placeholder="Ej: Estrellas, Créditos, DogeCoins"
                class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <!-- Symbol -->
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Símbolo
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="symbol in symbolOptions"
                  :key="symbol"
                  type="button"
                  @click="createForm.currency_symbol = symbol"
                  class="w-12 h-12 text-2xl rounded-xl transition-all"
                  :class="createForm.currency_symbol === symbol
                    ? 'bg-primary-600 scale-110 shadow-lg shadow-primary-500/30'
                    : 'bg-surface-700 hover:bg-surface-600'"
                >
                  {{ symbol }}
                </button>
              </div>
            </div>

            <!-- Treasury -->
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Bolsa total del semestre
              </label>
              <p class="text-xs text-surface-500 mb-3">
                Define cuántas monedas tendrás para emitir durante todo el curso
              </p>
              <div class="flex flex-wrap gap-2 mb-3">
                <button
                  v-for="preset in treasuryPresets"
                  :key="preset"
                  type="button"
                  @click="createForm.treasury_total = preset"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  :class="createForm.treasury_total === preset
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-700 text-surface-300 hover:bg-surface-600'"
                >
                  {{ preset.toLocaleString() }}
                </button>
              </div>
              <input
                v-model.number="createForm.treasury_total"
                type="number"
                min="100"
                max="1000000"
                class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <!-- Error -->
            <div v-if="createError" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {{ createError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="showCreateModal = false"
                class="flex-1 py-3 px-4 bg-surface-700 hover:bg-surface-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="flex-1 py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
              >
                {{ creating ? 'Creando...' : 'Crear aula' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.classroom-card {
  @apply p-5 rounded-2xl transition-all duration-200;
  @apply bg-surface-800/50 hover:bg-surface-800/80;
  @apply border border-surface-700/50 hover:border-surface-600/50;
  @apply active:scale-[0.98];
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
