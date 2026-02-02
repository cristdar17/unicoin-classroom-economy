<script setup lang="ts">
import type { Classroom, MarketItem } from '~/types'
import { MARKET_ITEM_TEMPLATES, ITEM_CATEGORIES } from '~/utils/economy'

definePageMeta({
  layout: 'teacher',
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const classrooms = ref<Classroom[]>([])
const items = ref<MarketItem[]>([])
const selectedClassroom = ref<string>('')
const loading = ref(true)
const loadingItems = ref(false)
const showCreateModal = ref(false)
const showTemplatesModal = ref(false)
const updatingPrices = ref(false)

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

// Load items when classroom changes
watch(selectedClassroom, async (classroomId) => {
  if (!classroomId) {
    items.value = []
    return
  }

  loadingItems.value = true

  try {
    const { data } = await client
      .from('market_items')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false })

    items.value = data || []
  } catch (e) {
    console.error('Error loading items:', e)
  } finally {
    loadingItems.value = false
  }
})

const selectedClassroomData = computed(() =>
  classrooms.value.find(c => c.id === selectedClassroom.value)
)

// Group templates by category
const templatesByCategory = computed(() => {
  const grouped: Record<string, typeof MARKET_ITEM_TEMPLATES> = {}
  for (const cat of ITEM_CATEGORIES) {
    grouped[cat.id] = MARKET_ITEM_TEMPLATES.filter(t => t.category === cat.id)
  }
  return grouped
})

// Create item form
const createForm = reactive({
  name: '',
  description: '',
  base_price: 100,
  stock: null as number | null,
  type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COLLECTIVE',
})

const creating = ref(false)
const createError = ref('')

const resetForm = () => {
  createForm.name = ''
  createForm.description = ''
  createForm.base_price = 100
  createForm.stock = null
  createForm.type = 'INDIVIDUAL'
}

const handleCreate = async () => {
  if (!createForm.name.trim()) {
    createError.value = 'El nombre es requerido'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    const { error } = await client
      .from('market_items')
      .insert({
        classroom_id: selectedClassroom.value,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        base_price: createForm.base_price,
        current_price: createForm.base_price,
        stock: createForm.stock,
        type: createForm.type,
        is_active: true,
      })

    if (error) throw error

    showCreateModal.value = false
    resetForm()

    // Reload items
    const { data } = await client
      .from('market_items')
      .select('*')
      .eq('classroom_id', selectedClassroom.value)
      .order('created_at', { ascending: false })

    items.value = data || []
  } catch (e: any) {
    createError.value = e.message || 'Error al crear item'
  } finally {
    creating.value = false
  }
}

const addFromTemplate = (template: typeof MARKET_ITEM_TEMPLATES[0]) => {
  createForm.name = template.name
  createForm.description = template.description
  createForm.base_price = template.basePrice
  createForm.stock = template.suggestedStock
  createForm.type = template.type || 'INDIVIDUAL'
  showTemplatesModal.value = false
  showCreateModal.value = true
}

const addAllFromCategory = async (categoryId: string) => {
  const templates = templatesByCategory.value[categoryId]
  if (!templates?.length) return

  creating.value = true

  try {
    const itemsToInsert = templates.map(t => ({
      classroom_id: selectedClassroom.value,
      name: t.name,
      description: t.description,
      base_price: t.basePrice,
      current_price: t.basePrice,
      stock: t.suggestedStock,
      type: t.type || 'INDIVIDUAL',
      is_active: true,
    }))

    const { error } = await client.from('market_items').insert(itemsToInsert)
    if (error) throw error

    showTemplatesModal.value = false

    // Reload
    const { data } = await client
      .from('market_items')
      .select('*')
      .eq('classroom_id', selectedClassroom.value)
      .order('created_at', { ascending: false })

    items.value = data || []
  } catch (e: any) {
    alert('Error: ' + e.message)
  } finally {
    creating.value = false
  }
}

const toggleItemActive = async (item: MarketItem) => {
  try {
    await client
      .from('market_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)

    item.is_active = !item.is_active
  } catch (e) {
    console.error('Error toggling item:', e)
  }
}

const deleteItem = async (item: MarketItem) => {
  if (!confirm(`¿Eliminar "${item.name}"?`)) return

  try {
    await client.from('market_items').delete().eq('id', item.id)
    items.value = items.value.filter(i => i.id !== item.id)
  } catch (e) {
    console.error('Error deleting item:', e)
  }
}

const updatePrices = async () => {
  if (!selectedClassroom.value) return

  updatingPrices.value = true

  try {
    const response = await $fetch('/api/market/update-prices', {
      method: 'POST',
      body: { classroom_id: selectedClassroom.value },
    })

    // Reload items to see new prices
    const { data } = await client
      .from('market_items')
      .select('*')
      .eq('classroom_id', selectedClassroom.value)
      .order('created_at', { ascending: false })

    items.value = data || []

    alert(`Precios actualizados: ${response.data?.updated} items modificados. Inflación: ${response.data?.inflationRate}`)
  } catch (e: any) {
    alert('Error: ' + e.message)
  } finally {
    updatingPrices.value = false
  }
}

const getPriceChange = (item: MarketItem) => {
  if (item.current_price === item.base_price) return null
  const change = ((item.current_price - item.base_price) / item.base_price) * 100
  return {
    value: change.toFixed(0),
    isUp: change > 0,
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Marketplace</h1>
        <p class="text-surface-400">Gestiona los items con precios dinámicos</p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-surface-400">Cargando...</div>
    </div>

    <template v-else>
      <div v-if="classrooms.length === 0" class="text-center py-12">
        <p class="text-surface-400">No tienes aulas. Crea una primero.</p>
      </div>

      <div v-else>
        <!-- Header actions -->
        <div class="flex flex-wrap gap-3 mb-6">
          <select
            v-model="selectedClassroom"
            class="px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          <template v-if="selectedClassroom">
            <button
              @click="showTemplatesModal = true"
              class="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
            >
              📦 Agregar desde plantillas
            </button>

            <button
              @click="updatePrices"
              :disabled="updatingPrices"
              class="px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {{ updatingPrices ? '⏳ Calculando...' : '📊 Actualizar precios' }}
            </button>
          </template>
        </div>

        <template v-if="selectedClassroom">
          <!-- Add custom item -->
          <button
            @click="showCreateModal = true"
            class="w-full mb-6 p-4 border-2 border-dashed border-surface-700 hover:border-primary-500/50 rounded-2xl text-surface-400 hover:text-primary-400 transition-all hover:bg-primary-500/5"
          >
            + Agregar item personalizado
          </button>

          <!-- Items list -->
          <div v-if="loadingItems" class="text-surface-400">Cargando items...</div>

          <div v-else-if="items.length === 0" class="text-center py-16">
            <div class="text-6xl mb-4">🏪</div>
            <p class="text-xl text-white mb-2">Mercado vacío</p>
            <p class="text-surface-400 mb-6">Usa las plantillas para agregar items rápidamente</p>
            <button
              @click="showTemplatesModal = true"
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
            >
              Ver plantillas
            </button>
          </div>

          <div v-else class="grid gap-4 md:grid-cols-2">
            <div
              v-for="item in items"
              :key="item.id"
              class="glass-card rounded-2xl p-5"
              :class="!item.is_active && 'opacity-50'"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-semibold text-white">{{ item.name }}</h3>
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      :class="item.type === 'COLLECTIVE'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-blue-500/20 text-blue-300'"
                    >
                      {{ item.type === 'COLLECTIVE' ? 'Grupal' : 'Individual' }}
                    </span>
                    <span
                      v-if="!item.is_active"
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300"
                    >
                      Pausado
                    </span>
                  </div>
                  <p v-if="item.description" class="text-surface-400 text-sm mt-1">
                    {{ item.description }}
                  </p>
                </div>
              </div>

              <!-- Pricing -->
              <div class="flex items-end justify-between mt-4">
                <div>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold text-white">{{ item.current_price }}</span>
                    <span class="text-surface-400">{{ selectedClassroomData?.currency_symbol }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      v-if="item.current_price !== item.base_price"
                      class="text-xs text-surface-500 line-through"
                    >
                      Base: {{ item.base_price }}
                    </span>
                    <span
                      v-if="getPriceChange(item)"
                      class="text-xs font-medium"
                      :class="getPriceChange(item)?.isUp ? 'text-red-400' : 'text-emerald-400'"
                    >
                      {{ getPriceChange(item)?.isUp ? '↑' : '↓' }}{{ getPriceChange(item)?.value }}%
                    </span>
                  </div>
                  <div v-if="item.stock !== null" class="text-surface-500 text-xs mt-1">
                    Stock: {{ item.stock }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                  <button
                    @click="toggleItemActive(item)"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    :class="item.is_active
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'"
                  >
                    {{ item.is_active ? 'Pausar' : 'Activar' }}
                  </button>
                  <button
                    @click="deleteItem(item)"
                    class="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Templates Modal -->
    <Teleport to="body">
      <div
        v-if="showTemplatesModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showTemplatesModal = false" />

        <div class="relative w-full max-w-2xl max-h-[80vh] bg-surface-800 rounded-3xl shadow-2xl overflow-hidden">
          <div class="sticky top-0 bg-surface-800 border-b border-surface-700 p-6">
            <h2 class="text-xl font-bold text-white">Plantillas de Items</h2>
            <p class="text-surface-400 text-sm">Agrega items predefinidos con un click</p>
          </div>

          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div v-for="cat in ITEM_CATEGORIES" :key="cat.id" class="mb-8 last:mb-0">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-white flex items-center gap-2">
                  <span>{{ cat.icon }}</span>
                  {{ cat.name }}
                </h3>
                <button
                  @click="addAllFromCategory(cat.id)"
                  class="text-xs text-primary-400 hover:text-primary-300"
                >
                  + Agregar todos
                </button>
              </div>

              <div class="grid gap-2">
                <button
                  v-for="template in templatesByCategory[cat.id]"
                  :key="template.name"
                  @click="addFromTemplate(template)"
                  class="flex items-center justify-between p-3 rounded-xl bg-surface-700/50 hover:bg-surface-700 transition-colors text-left"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{{ template.icon }}</span>
                    <div>
                      <div class="font-medium text-white text-sm">{{ template.name }}</div>
                      <div class="text-xs text-surface-400">{{ template.description }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-white">{{ template.basePrice }}</div>
                    <div class="text-xs text-surface-500">
                      {{ template.suggestedStock ? `${template.suggestedStock} uds` : '∞' }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="sticky bottom-0 bg-surface-800 border-t border-surface-700 p-4">
            <button
              @click="showTemplatesModal = false"
              class="w-full py-3 bg-surface-700 hover:bg-surface-600 text-white rounded-xl font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateModal = false" />

        <div class="relative w-full max-w-md bg-surface-800 rounded-3xl p-6 shadow-2xl">
          <h2 class="text-xl font-bold text-white mb-6">
            {{ createForm.name ? 'Personalizar item' : 'Nuevo item' }}
          </h2>

          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-surface-300 mb-1">Nombre</label>
              <input
                v-model="createForm.name"
                type="text"
                placeholder="Ej: +0.5 en el parcial"
                class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-300 mb-1">Descripción</label>
              <input
                v-model="createForm.description"
                type="text"
                placeholder="Detalles del beneficio"
                class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-surface-300 mb-1">Precio base</label>
                <input
                  v-model.number="createForm.base_price"
                  type="number"
                  min="1"
                  class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-300 mb-1">Stock</label>
                <input
                  v-model.number="createForm.stock"
                  type="number"
                  min="0"
                  placeholder="∞"
                  class="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-300 mb-2">Tipo</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="createForm.type = 'INDIVIDUAL'"
                  class="p-3 rounded-xl border-2 transition-all text-left"
                  :class="createForm.type === 'INDIVIDUAL' ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'"
                >
                  <div class="font-medium text-white">Individual</div>
                  <div class="text-xs text-surface-400">Un estudiante</div>
                </button>
                <button
                  type="button"
                  @click="createForm.type = 'COLLECTIVE'"
                  class="p-3 rounded-xl border-2 transition-all text-left"
                  :class="createForm.type === 'COLLECTIVE' ? 'border-purple-500 bg-purple-500/10' : 'border-surface-700'"
                >
                  <div class="font-medium text-white">Colectivo</div>
                  <div class="text-xs text-surface-400">Varios contribuyen</div>
                </button>
              </div>
            </div>

            <div v-if="createError" class="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">
              {{ createError }}
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="showCreateModal = false; resetForm()"
                class="flex-1 py-3 bg-surface-700 hover:bg-surface-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="flex-1 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {{ creating ? 'Creando...' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
