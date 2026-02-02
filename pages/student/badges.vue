<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

interface Badge {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  rarity: string
  reward_amount: number
  criteria_type: string
  criteria_value: number | null
  criteria_streak_type: string | null
}

interface UnlockedBadge {
  id: string
  unlocked_at: string
  level: number
  badge: Badge
}

interface BadgesData {
  unlocked: UnlockedBadge[]
  locked: Badge[]
  stats: {
    total: number
    unlocked: number
    progress: number
    by_rarity: {
      COMMON: number
      RARE: number
      EPIC: number
      LEGENDARY: number
    }
  }
  new_badges: Badge[]
  reward_earned: number
}

const { classroom } = useStudentSession()
const studentToken = useStudentToken()

const badgesData = ref<BadgesData | null>(null)
const loading = ref(true)
const showNewBadgeModal = ref(false)
const selectedBadge = ref<Badge | null>(null)
const activeTab = ref<'unlocked' | 'locked' | 'all'>('unlocked')

const categories = [
  { id: 'STREAK', name: 'Rachas', icon: '🔥' },
  { id: 'WEALTH', name: 'Riqueza', icon: '💰' },
  { id: 'TRADING', name: 'Comercio', icon: '🤝' },
  { id: 'SAVINGS', name: 'Ahorro', icon: '🏦' },
  { id: 'SOCIAL', name: 'Social', icon: '👥' },
  { id: 'SPECIAL', name: 'Especial', icon: '⭐' },
]

const rarityStyles = {
  COMMON: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    text: 'text-gray-300',
    glow: '',
    label: 'Común'
  },
  RARE: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20',
    label: 'Raro'
  },
  EPIC: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/30',
    label: 'Épico'
  },
  LEGENDARY: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/40 shadow-lg',
    label: 'Legendario'
  }
}

const loadBadges = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/student/my-badges', {
      headers: { Authorization: `Bearer ${studentToken.value}` }
    })
    badgesData.value = response.data

    // Show new badges modal if any were just unlocked
    if (response.data.new_badges && response.data.new_badges.length > 0) {
      selectedBadge.value = response.data.new_badges[0]
      showNewBadgeModal.value = true
    }
  } catch (e) {
    console.error('Error loading badges:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadBadges)

const getRarityStyle = (rarity: string) => {
  return rarityStyles[rarity as keyof typeof rarityStyles] || rarityStyles.COMMON
}

const getCategoryInfo = (categoryId: string) => {
  return categories.find(c => c.id === categoryId) || { name: categoryId, icon: '🏷️' }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const filteredUnlocked = computed(() => {
  if (!badgesData.value) return []
  return badgesData.value.unlocked
})

const filteredLocked = computed(() => {
  if (!badgesData.value) return []
  return badgesData.value.locked
})

const groupedUnlocked = computed(() => {
  const groups: Record<string, UnlockedBadge[]> = {}
  for (const badge of filteredUnlocked.value) {
    const category = badge.badge.category
    if (!groups[category]) groups[category] = []
    groups[category].push(badge)
  }
  return groups
})

const groupedLocked = computed(() => {
  const groups: Record<string, Badge[]> = {}
  for (const badge of filteredLocked.value) {
    const category = badge.category
    if (!groups[category]) groups[category] = []
    groups[category].push(badge)
  }
  return groups
})

const closeNewBadgeModal = () => {
  showNewBadgeModal.value = false
  // Show next badge if multiple were unlocked
  if (badgesData.value?.new_badges && badgesData.value.new_badges.length > 1) {
    const currentIndex = badgesData.value.new_badges.findIndex(b => b.id === selectedBadge.value?.id)
    if (currentIndex < badgesData.value.new_badges.length - 1) {
      selectedBadge.value = badgesData.value.new_badges[currentIndex + 1]
      setTimeout(() => {
        showNewBadgeModal.value = true
      }, 300)
    }
  }
}
</script>

<template>
  <div class="min-h-screen pb-8">
    <!-- Header -->
    <div class="sticky top-0 z-20 px-4 pt-4 pb-3 bg-gradient-to-b from-surface-950 via-surface-950 to-transparent">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Mis Insignias</h1>
          <p class="text-surface-400 text-sm">Colecciona logros y recompensas</p>
        </div>
      </div>

      <!-- Progress Card -->
      <div v-if="badgesData" class="glass-card rounded-xl p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-surface-400">Progreso total</span>
          <span class="text-white font-semibold">
            {{ badgesData.stats.unlocked }}/{{ badgesData.stats.total }}
          </span>
        </div>
        <div class="h-3 bg-surface-700 rounded-full overflow-hidden mb-3">
          <div
            class="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500"
            :style="{ width: `${badgesData.stats.progress}%` }"
          />
        </div>
        <!-- Rarity counts -->
        <div class="flex justify-between text-xs">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-gray-400" />
            <span class="text-gray-400">{{ badgesData.stats.by_rarity.COMMON }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-blue-400" />
            <span class="text-blue-400">{{ badgesData.stats.by_rarity.RARE }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-purple-400" />
            <span class="text-purple-400">{{ badgesData.stats.by_rarity.EPIC }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-400" />
            <span class="text-amber-400">{{ badgesData.stats.by_rarity.LEGENDARY }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2">
        <button
          v-for="tab in [
            { id: 'unlocked', label: 'Desbloqueadas', icon: '🏆' },
            { id: 'locked', label: 'Por conseguir', icon: '🔒' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id as any"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="activeTab === tab.id
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
            : 'bg-surface-800/50 text-surface-300 hover:bg-surface-800'"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-4">
      <div v-for="i in 6" :key="i" class="h-20 rounded-xl skeleton" />
    </div>

    <!-- Unlocked Tab -->
    <div v-else-if="activeTab === 'unlocked'" class="px-4">
      <div v-if="filteredUnlocked.length === 0" class="py-16 text-center">
        <div class="text-6xl mb-4">🎯</div>
        <h2 class="text-xl font-semibold text-white mb-2">Sin insignias aún</h2>
        <p class="text-surface-400">¡Sigue participando para desbloquear tu primera insignia!</p>
      </div>

      <template v-else>
        <div v-for="(badges, category) in groupedUnlocked" :key="category" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">{{ getCategoryInfo(category).icon }}</span>
            <h3 class="font-semibold text-white">{{ getCategoryInfo(category).name }}</h3>
            <span class="text-surface-400 text-sm">({{ badges.length }})</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="item in badges"
              :key="item.id"
              class="badge-card unlocked"
              :class="[
                getRarityStyle(item.badge.rarity).bg,
                getRarityStyle(item.badge.rarity).border,
                getRarityStyle(item.badge.rarity).glow
              ]"
              @click="selectedBadge = item.badge; showNewBadgeModal = true"
            >
              <div class="text-3xl mb-1">{{ item.badge.icon }}</div>
              <div class="text-xs font-medium text-white text-center line-clamp-2">
                {{ item.badge.name }}
              </div>
              <div
                class="text-[10px] mt-1 px-1.5 py-0.5 rounded"
                :class="[getRarityStyle(item.badge.rarity).bg, getRarityStyle(item.badge.rarity).text]"
              >
                {{ getRarityStyle(item.badge.rarity).label }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Locked Tab -->
    <div v-else-if="activeTab === 'locked'" class="px-4">
      <div v-if="filteredLocked.length === 0" class="py-16 text-center">
        <div class="text-6xl mb-4">🎉</div>
        <h2 class="text-xl font-semibold text-white mb-2">¡Colección completa!</h2>
        <p class="text-surface-400">Has desbloqueado todas las insignias disponibles</p>
      </div>

      <template v-else>
        <div v-for="(badges, category) in groupedLocked" :key="category" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">{{ getCategoryInfo(category).icon }}</span>
            <h3 class="font-semibold text-white">{{ getCategoryInfo(category).name }}</h3>
            <span class="text-surface-400 text-sm">({{ badges.length }})</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="badge in badges"
              :key="badge.id"
              class="badge-card locked"
              @click="selectedBadge = badge; showNewBadgeModal = true"
            >
              <div class="text-3xl mb-1 grayscale opacity-50">{{ badge.icon }}</div>
              <div class="text-xs font-medium text-surface-500 text-center line-clamp-2">
                {{ badge.name }}
              </div>
              <div class="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">
                {{ getRarityStyle(badge.rarity).label }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Badge Detail Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showNewBadgeModal && selectedBadge"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          @click.self="closeNewBadgeModal"
        >
          <div
            class="relative w-full max-w-sm glass-card rounded-3xl p-6 text-center animate-bounce-in"
            :class="getRarityStyle(selectedBadge.rarity).glow"
          >
            <!-- Rarity glow effect -->
            <div
              v-if="selectedBadge.rarity === 'LEGENDARY'"
              class="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 animate-pulse"
            />

            <div class="relative">
              <!-- Badge icon -->
              <div
                class="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl"
                :class="[getRarityStyle(selectedBadge.rarity).bg, getRarityStyle(selectedBadge.rarity).border, 'border-2']"
              >
                {{ selectedBadge.icon }}
              </div>

              <!-- Badge name -->
              <h2 class="text-2xl font-bold text-white mb-2">{{ selectedBadge.name }}</h2>

              <!-- Rarity badge -->
              <div
                class="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4"
                :class="[getRarityStyle(selectedBadge.rarity).bg, getRarityStyle(selectedBadge.rarity).text, getRarityStyle(selectedBadge.rarity).border, 'border']"
              >
                {{ getRarityStyle(selectedBadge.rarity).label }}
              </div>

              <!-- Description -->
              <p class="text-surface-300 mb-4">{{ selectedBadge.description }}</p>

              <!-- Reward -->
              <div v-if="selectedBadge.reward_amount > 0" class="mb-4">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <span class="text-emerald-400 font-semibold">+{{ selectedBadge.reward_amount }}</span>
                  <span class="text-emerald-300">{{ classroom?.currency_symbol }}</span>
                </div>
              </div>

              <!-- Category -->
              <div class="flex items-center justify-center gap-2 text-surface-400 text-sm">
                <span>{{ getCategoryInfo(selectedBadge.category).icon }}</span>
                <span>{{ getCategoryInfo(selectedBadge.category).name }}</span>
              </div>

              <!-- Close button -->
              <button
                @click="closeNewBadgeModal"
                class="mt-6 w-full px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-500 to-purple-500 text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.badge-card {
  @apply relative p-3 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border;
  min-height: 100px;
}

.badge-card.unlocked {
  @apply hover:scale-105 active:scale-95;
}

.badge-card.locked {
  @apply bg-surface-800/50 border-surface-700;
}

@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
