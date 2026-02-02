<script setup lang="ts">
import type { MarketItem } from '~/types'
import { ITEM_CATEGORIES } from '~/utils/economy'

definePageMeta({
  layout: 'student',
})

const { wallet, classroom, loading: sessionLoading, refresh } = useStudentSession()

const items = ref<MarketItem[]>([])
const loading = ref(true)
const purchasing = ref<string | null>(null)
const selectedCategory = ref<string>('all')
const showSuccessModal = ref(false)
const purchasedItem = ref<MarketItem | null>(null)

// Load market items
const loadItems = async () => {
  if (!classroom.value) return

  try {
    const response = await $fetch(`/api/market/items?classroom_id=${classroom.value.id}`)
    items.value = response.data || []
  } catch (e) {
    console.error('Error loading market:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)

const categories = [
  { id: 'all', name: 'Todo', icon: '🏪' },
  ...ITEM_CATEGORIES,
]

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') return items.value
  // Match by name patterns for categorization
  return items.value.filter(item => {
    const name = item.name.toLowerCase()
    switch (selectedCategory.value) {
      case 'academic': return name.includes('parcial') || name.includes('taller') || name.includes('nota')
      case 'time': return name.includes('extensión') || name.includes('habilitación') || name.includes('24h') || name.includes('48h')
      case 'privilege': return name.includes('salida') || name.includes('puesto') || name.includes('clase')
      case 'exam': return name.includes('pista') || name.includes('quiz') || name.includes('pregunta') || name.includes('repetir')
      case 'fun': return name.includes('snack') || name.includes('música') || name.includes('lista')
      default: return true
    }
  })
})

const canAfford = (price: number) => (wallet.value?.balance || 0) >= price

const getPriceStatus = (item: MarketItem) => {
  const diff = item.current_price - item.base_price
  const percent = ((diff / item.base_price) * 100).toFixed(0)
  if (diff > 0) return { trend: 'up', text: `+${percent}%`, color: 'text-red-400' }
  if (diff < 0) return { trend: 'down', text: `${percent}%`, color: 'text-emerald-400' }
  return { trend: 'stable', text: 'Base', color: 'text-surface-400' }
}

const getStockStatus = (item: MarketItem) => {
  if (item.stock === null) return { text: '∞', color: 'text-surface-400', urgent: false }
  if (item.stock === 0) return { text: 'Agotado', color: 'text-red-400', urgent: false }
  if (item.stock <= 3) return { text: `¡Solo ${item.stock}!`, color: 'text-amber-400', urgent: true }
  return { text: `${item.stock} disp.`, color: 'text-surface-400', urgent: false }
}

const showPurchaseModal = ref(false)
const selectedItem = ref<MarketItem | null>(null)
const purchaseMessage = ref('')

const openPurchaseModal = (item: MarketItem) => {
  if (!canAfford(item.current_price) || item.stock === 0) return
  selectedItem.value = item
  purchaseMessage.value = ''
  showPurchaseModal.value = true
}

const handlePurchase = async (item: MarketItem) => {
  if (!canAfford(item.current_price) || item.stock === 0) return

  purchasing.value = item.id
  showPurchaseModal.value = false

  const studentToken = useStudentToken()

  try {
    const response = await $fetch('/api/market/purchase', {
      method: 'POST',
      body: {
        item_id: item.id,
        message: purchaseMessage.value || undefined,
      },
      headers: {
        Authorization: `Bearer ${studentToken.value}`,
      },
    })

    if (response.error) throw new Error(response.error)

    // Show pending modal (not success - needs teacher approval)
    purchasedItem.value = item
    showSuccessModal.value = true

    // Don't update local state - wait for teacher approval
    // Refresh after delay
    setTimeout(() => {
      showSuccessModal.value = false
      purchasedItem.value = null
    }, 4000)
  } catch (e: any) {
    alert(e.data?.message || e.message || 'Error al comprar')
  } finally {
    purchasing.value = null
  }
}
</script>

<template>
  <div class="min-h-screen pb-8">
    <!-- Header -->
    <div class="sticky top-0 z-20 px-4 pt-4 pb-3 bg-gradient-to-b from-surface-950 via-surface-950 to-transparent">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Mercado</h1>
          <p class="text-surface-400 text-sm">Precios dinámicos en tiempo real</p>
        </div>

        <!-- Balance pill -->
        <div class="flex items-center gap-2 px-4 py-2 rounded-full glass">
          <span class="text-lg font-bold text-white">{{ wallet?.balance?.toLocaleString() || 0 }}</span>
          <span class="text-lg">{{ classroom?.currency_symbol }}</span>
        </div>
      </div>

      <!-- Categories -->
      <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          :class="selectedCategory === cat.id
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
            : 'bg-surface-800/50 text-surface-300 hover:bg-surface-800'"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="sessionLoading || loading" class="px-4 space-y-4">
      <div v-for="i in 4" :key="i" class="h-32 rounded-2xl skeleton" />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="px-4 py-16 text-center">
      <div class="text-6xl mb-4">🏪</div>
      <h2 class="text-xl font-semibold text-white mb-2">Mercado vacío</h2>
      <p class="text-surface-400">No hay items disponibles en esta categoría</p>
    </div>

    <!-- Items Grid -->
    <div v-else class="px-4 space-y-3">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="market-item-card group"
        :class="[
          item.stock === 0 && 'opacity-50',
          !canAfford(item.current_price) && 'opacity-70',
        ]"
      >
        <!-- Glow effect for affordable items -->
        <div
          v-if="canAfford(item.current_price) && item.stock !== 0"
          class="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
        />

        <div class="relative">
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold text-white">{{ item.name }}</h3>
                <!-- Type badge -->
                <span
                  v-if="item.type === 'COLLECTIVE'"
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  Grupal
                </span>
              </div>
              <p v-if="item.description" class="text-surface-400 text-sm line-clamp-2">
                {{ item.description }}
              </p>
            </div>

            <!-- Stock indicator -->
            <div
              class="flex-shrink-0 ml-3 text-right"
              :class="getStockStatus(item).color"
            >
              <div
                v-if="getStockStatus(item).urgent"
                class="text-xs font-bold animate-pulse"
              >
                {{ getStockStatus(item).text }}
              </div>
              <div v-else class="text-xs">
                {{ getStockStatus(item).text }}
              </div>
            </div>
          </div>

          <!-- Price section -->
          <div class="flex items-end justify-between">
            <div>
              <!-- Current price -->
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-white">{{ item.current_price }}</span>
                <span class="text-lg text-surface-400">{{ classroom?.currency_symbol }}</span>
              </div>

              <!-- Price trend -->
              <div class="flex items-center gap-2 mt-1">
                <span
                  v-if="item.current_price !== item.base_price"
                  class="text-xs line-through text-surface-500"
                >
                  {{ item.base_price }}
                </span>
                <span
                  :class="getPriceStatus(item).color"
                  class="text-xs font-medium flex items-center gap-1"
                >
                  <span v-if="getPriceStatus(item).trend === 'up'">↑</span>
                  <span v-else-if="getPriceStatus(item).trend === 'down'">↓</span>
                  {{ getPriceStatus(item).text }}
                </span>
              </div>
            </div>

            <!-- Buy button -->
            <button
              v-if="item.type === 'INDIVIDUAL'"
              @click="openPurchaseModal(item)"
              :disabled="!canAfford(item.current_price) || purchasing === item.id || item.stock === 0"
              class="buy-button"
              :class="[
                canAfford(item.current_price) && item.stock !== 0
                  ? 'bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-400 hover:to-purple-400 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-surface-700 text-surface-400 cursor-not-allowed',
              ]"
            >
              <span v-if="purchasing === item.id" class="flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </span>
              <span v-else-if="item.stock === 0">Agotado</span>
              <span v-else-if="!canAfford(item.current_price)">Sin fondos</span>
              <span v-else>Comprar</span>
            </button>

            <NuxtLink
              v-else
              :to="`/student/market/collective/${item.id}`"
              class="buy-button bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
            >
              Contribuir
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase Confirmation Modal -->
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
          v-if="showPurchaseModal && selectedItem"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="showPurchaseModal = false"
        >
          <div class="relative w-full max-w-sm glass-card rounded-3xl p-6">
            <h2 class="text-xl font-bold text-white mb-4">Confirmar compra</h2>

            <div class="bg-surface-800/50 rounded-xl p-4 mb-4">
              <h3 class="font-semibold text-white">{{ selectedItem.name }}</h3>
              <p class="text-surface-400 text-sm">{{ selectedItem.description }}</p>
              <div class="flex items-baseline gap-2 mt-2">
                <span class="text-2xl font-bold text-white">{{ selectedItem.current_price }}</span>
                <span class="text-surface-400">{{ classroom?.currency_symbol }}</span>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-surface-300 mb-2">
                Mensaje para el docente (opcional)
              </label>
              <textarea
                v-model="purchaseMessage"
                placeholder="Ej: Para el parcial del viernes..."
                rows="3"
                class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div class="flex gap-3">
              <button
                @click="showPurchaseModal = false"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="handlePurchase(selectedItem)"
                :disabled="purchasing === selectedItem.id"
                class="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-500 to-purple-500 text-white hover:from-primary-400 hover:to-purple-400 transition-all disabled:opacity-50"
              >
                <span v-if="purchasing === selectedItem.id" class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
                <span v-else>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Success Modal -->
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
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div class="relative w-full max-w-sm">
            <!-- Pending indicator -->
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 animate-ping" />
            </div>

            <!-- Card -->
            <div class="relative glass-card rounded-3xl p-8 text-center animate-bounce-in">
              <div class="text-6xl mb-4">⏳</div>
              <h2 class="text-2xl font-bold text-white mb-2">Solicitud enviada</h2>
              <p class="text-surface-300 mb-4">
                Tu compra de <span class="font-semibold text-white">{{ purchasedItem?.name }}</span> está pendiente de aprobación
              </p>
              <div class="text-surface-400 text-sm">
                El docente revisará tu solicitud pronto
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.market-item-card {
  @apply relative p-4 rounded-2xl transition-all duration-200;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.market-item-card:active {
  transform: scale(0.98);
}

.buy-button {
  @apply px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200;
  @apply active:scale-95;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
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
