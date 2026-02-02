<script setup lang="ts">
import type { Classroom, StudentWithWallet } from '~/types'

definePageMeta({
  layout: 'teacher',
})

const route = useRoute()
const client = useSupabaseClient()

const classroom = ref<Classroom | null>(null)
const students = ref<StudentWithWallet[]>([])
const loading = ref(true)

const classroomId = route.params.id as string

onMounted(async () => {
  try {
    // Load classroom
    const { data: classroomData } = await client
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single()

    classroom.value = classroomData

    // Load students
    const response = await $fetch(`/api/classroom/${classroomId}/students`)
    students.value = response.data || []
  } catch (e) {
    console.error('Error loading classroom:', e)
  } finally {
    loading.value = false
  }
})

const treasuryPercentage = computed(() => {
  if (!classroom.value?.treasury_total) return 100
  return Math.round((classroom.value.treasury_remaining / classroom.value.treasury_total) * 100)
})

const copyCode = async () => {
  if (classroom.value?.code) {
    await navigator.clipboard.writeText(classroom.value.code)
    alert('Código copiado!')
  }
}

const totalInCirculation = computed(() =>
  students.value.reduce((sum, s) => sum + (s.wallet?.balance || 0), 0)
)
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else-if="classroom">
      <!-- Header -->
      <div class="flex items-start justify-between mb-8">
        <div>
          <NuxtLink to="/teacher" class="text-surface-400 hover:text-white text-sm mb-2 inline-block">
            ← Volver a mis aulas
          </NuxtLink>
          <h1 class="text-3xl font-bold text-white flex items-center gap-3">
            <span class="text-4xl">{{ classroom.currency_symbol }}</span>
            {{ classroom.name }}
          </h1>
          <p class="text-surface-400 mt-1">{{ classroom.currency_name }}</p>
        </div>
        <div class="text-right">
          <div class="text-sm text-surface-400 mb-1">Código de clase</div>
          <button
            @click="copyCode"
            class="text-3xl font-mono font-bold text-primary-400 hover:text-primary-300 tracking-widest"
          >
            {{ classroom.code }}
          </button>
          <div class="text-xs text-surface-500">Click para copiar</div>
        </div>
      </div>

      <!-- Stats cards -->
      <div class="grid gap-4 md:grid-cols-4 mb-8">
        <div class="p-5 rounded-2xl bg-surface-800/50 border border-surface-700/50">
          <div class="text-surface-400 text-sm mb-1">Estudiantes</div>
          <div class="text-3xl font-bold text-white">{{ students.length }}</div>
        </div>

        <div class="p-5 rounded-2xl bg-surface-800/50 border border-surface-700/50">
          <div class="text-surface-400 text-sm mb-1">En circulación</div>
          <div class="text-3xl font-bold text-emerald-400">{{ totalInCirculation.toLocaleString() }}</div>
        </div>

        <div class="p-5 rounded-2xl bg-surface-800/50 border border-surface-700/50">
          <div class="text-surface-400 text-sm mb-1">Bolsa restante</div>
          <div class="text-3xl font-bold text-white">{{ (classroom.treasury_remaining || 0).toLocaleString() }}</div>
        </div>

        <div class="p-5 rounded-2xl bg-surface-800/50 border border-surface-700/50">
          <div class="text-surface-400 text-sm mb-1">Bolsa usada</div>
          <div class="text-3xl font-bold" :class="treasuryPercentage > 50 ? 'text-emerald-400' : treasuryPercentage > 20 ? 'text-amber-400' : 'text-red-400'">
            {{ 100 - treasuryPercentage }}%
          </div>
        </div>
      </div>

      <!-- Treasury progress -->
      <div class="p-6 rounded-2xl bg-surface-800/50 border border-surface-700/50 mb-8">
        <div class="flex items-center justify-between mb-3">
          <span class="font-medium text-white">Bolsa del curso</span>
          <span class="text-surface-400">
            {{ (classroom.treasury_remaining || 0).toLocaleString() }} / {{ (classroom.treasury_total || 0).toLocaleString() }}
          </span>
        </div>
        <div class="h-4 bg-surface-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="[
              treasuryPercentage > 50 && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
              treasuryPercentage <= 50 && treasuryPercentage > 20 && 'bg-gradient-to-r from-amber-500 to-amber-400',
              treasuryPercentage <= 20 && 'bg-gradient-to-r from-red-500 to-red-400',
            ]"
            :style="{ width: treasuryPercentage + '%' }"
          />
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid gap-3 md:grid-cols-4 mb-8">
        <NuxtLink
          to="/teacher/emit"
          class="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
        >
          <span class="text-2xl">💰</span>
          <span class="font-medium text-emerald-300">Emitir monedas</span>
        </NuxtLink>

        <NuxtLink
          to="/teacher/market-admin"
          class="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
        >
          <span class="text-2xl">🏪</span>
          <span class="font-medium text-purple-300">Gestionar mercado</span>
        </NuxtLink>

        <NuxtLink
          to="/teacher/audit"
          class="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
        >
          <span class="text-2xl">📋</span>
          <span class="font-medium text-blue-300">Ver auditoría</span>
        </NuxtLink>

        <NuxtLink
          to="/teacher/analytics"
          class="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
        >
          <span class="text-2xl">📈</span>
          <span class="font-medium text-amber-300">Ver métricas</span>
        </NuxtLink>
      </div>

      <!-- Students list -->
      <div>
        <h2 class="text-xl font-semibold text-white mb-4">Estudiantes</h2>

        <div v-if="students.length === 0" class="text-center py-12 rounded-2xl bg-surface-800/30">
          <div class="text-4xl mb-3">👥</div>
          <p class="text-surface-400">No hay estudiantes aún</p>
          <p class="text-surface-500 text-sm">Comparte el código {{ classroom.code }} con tus estudiantes</p>
        </div>

        <div v-else class="bg-surface-800/30 rounded-2xl overflow-hidden">
          <table class="w-full">
            <thead class="bg-surface-800/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-surface-400">#</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-surface-400">Estudiante</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-surface-400">Balance</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-surface-400">Se unió</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-700/50">
              <tr
                v-for="(student, index) in students.sort((a, b) => (b.wallet?.balance || 0) - (a.wallet?.balance || 0))"
                :key="student.id"
                class="hover:bg-surface-800/30"
              >
                <td class="px-4 py-3 text-surface-500">{{ index + 1 }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
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
                    <span class="font-medium text-white">{{ student.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="font-mono font-semibold" :class="(student.wallet?.balance || 0) > 0 ? 'text-emerald-400' : 'text-surface-400'">
                    {{ (student.wallet?.balance || 0).toLocaleString() }}
                  </span>
                  <span class="text-surface-500 ml-1">{{ classroom.currency_symbol }}</span>
                </td>
                <td class="px-4 py-3 text-right text-surface-500 text-sm">
                  {{ new Date(student.joined_at).toLocaleDateString('es') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-12">
      <p class="text-surface-400">Aula no encontrada</p>
      <NuxtLink to="/teacher" class="text-primary-400 hover:text-primary-300 mt-2 inline-block">
        Volver a mis aulas
      </NuxtLink>
    </div>
  </div>
</template>
