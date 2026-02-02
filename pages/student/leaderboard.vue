<script setup lang="ts">
import type { LeaderboardEntry } from '~/types'

definePageMeta({
  layout: 'student',
})

const { student, classroom, loading: sessionLoading } = useStudentSession()

const leaderboard = ref<LeaderboardEntry[]>([])
const loading = ref(true)

onMounted(async () => {
  if (!classroom.value) return

  try {
    const response = await $fetch(`/api/classroom/${classroom.value.id}/leaderboard`)
    leaderboard.value = response.data || []
  } catch (e) {
    console.error('Error loading leaderboard:', e)
  } finally {
    loading.value = false
  }
})

const getRankEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

const isCurrentStudent = (studentId: string) => student.value?.id === studentId
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-2">Ranking</h1>
    <p class="text-surface-400 mb-6">Los más ricos de {{ classroom?.name }}</p>

    <div v-if="sessionLoading || loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else-if="classroom">
      <div v-if="leaderboard.length === 0" class="text-center py-12 text-surface-400">
        Aún no hay datos para el ranking
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="entry in leaderboard"
          :key="entry.student_id"
          class="flex items-center gap-4 p-4 rounded-xl transition-colors"
          :class="isCurrentStudent(entry.student_id)
            ? 'bg-primary-900/50 border border-primary-500'
            : 'bg-surface-800'"
        >
          <!-- Rank -->
          <div class="w-12 text-center">
            <span v-if="entry.rank <= 3" class="text-2xl">{{ getRankEmoji(entry.rank) }}</span>
            <span v-else class="text-surface-400 font-mono">{{ getRankEmoji(entry.rank) }}</span>
          </div>

          <!-- Name -->
          <div class="flex-1">
            <div class="font-medium">
              {{ entry.student_name }}
              <span v-if="isCurrentStudent(entry.student_id)" class="text-primary-400 text-sm ml-1">
                (tú)
              </span>
            </div>
          </div>

          <!-- Balance -->
          <div class="text-right">
            <span class="font-bold">{{ entry.balance.toLocaleString() }}</span>
            <span class="text-surface-400 ml-1">{{ classroom.currency_symbol }}</span>
          </div>
        </div>
      </div>

      <!-- Find yourself hint -->
      <div
        v-if="student && !leaderboard.some(e => e.student_id === student.id)"
        class="mt-6 text-center text-surface-500 text-sm"
      >
        No apareces en el top. ¡Sigue participando!
      </div>
    </template>
  </div>
</template>
