<script setup lang="ts">
definePageMeta({
  layout: 'student',
})

const { student, wallet, classroom, loading: sessionLoading, refresh } = useStudentSession()
const studentToken = useStudentToken()

const photoUrl = ref<string | null>(null)
const uploading = ref(false)
const error = ref('')
const success = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

// Load current photo
const loadPhoto = async () => {
  try {
    const response = await $fetch('/api/student/photo', {
      headers: { Authorization: `Bearer ${studentToken.value}` }
    })
    photoUrl.value = response.data?.photo_url || null
  } catch (e) {
    console.error('Error loading photo:', e)
  }
}

onMounted(loadPhoto)

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Solo se permiten archivos JPG, PNG o WebP'
    return
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    error.value = 'El archivo debe ser menor a 4MB'
    return
  }

  error.value = ''
  success.value = ''
  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('photo', file)

    const response = await $fetch('/api/student/upload-photo', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${studentToken.value}`,
      },
    })

    photoUrl.value = response.data?.photo_url || null
    success.value = 'Foto actualizada correctamente'

    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (e: any) {
    error.value = e.data?.message || 'Error al subir la foto'
  } finally {
    uploading.value = false
    // Clear file input
    if (fileInput.value) fileInput.value.value = ''
  }
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="min-h-screen pb-8">
    <!-- Header -->
    <div class="px-4 pt-4 pb-6 bg-gradient-to-b from-primary-600/20 to-transparent">
      <h1 class="text-2xl font-bold text-white mb-2">Mi Perfil</h1>
      <p class="text-surface-400">Gestiona tu información personal</p>
    </div>

    <div v-if="sessionLoading" class="px-4 space-y-4">
      <div class="h-48 rounded-xl skeleton" />
      <div class="h-24 rounded-xl skeleton" />
    </div>

    <div v-else-if="student && classroom" class="px-4 -mt-4 space-y-6">
      <!-- Photo Card -->
      <div class="glass-card rounded-2xl p-6 text-center">
        <!-- Photo/Avatar -->
        <div class="relative inline-block mb-4">
          <div
            v-if="photoUrl"
            class="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-500/30 shadow-xl"
          >
            <img
              :src="photoUrl"
              :alt="student.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div
            v-else
            class="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center border-4 border-primary-500/30 shadow-xl"
          >
            <span class="text-4xl font-bold text-white">{{ getInitials(student.name) }}</span>
          </div>

          <!-- Upload button overlay -->
          <button
            @click="triggerFileSelect"
            :disabled="uploading"
            class="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-400 text-white flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
          >
            <span v-if="uploading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <!-- Hidden file input -->
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleFileSelect"
        />

        <!-- Name -->
        <h2 class="text-xl font-bold text-white mb-1">{{ student.name }}</h2>
        <p class="text-surface-400 text-sm">{{ classroom.name }}</p>

        <!-- Messages -->
        <div v-if="error" class="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {{ error }}
        </div>
        <div v-if="success" class="mt-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
          {{ success }}
        </div>

        <!-- Photo instructions -->
        <p class="mt-4 text-surface-500 text-xs">
          Toca el icono de cámara para subir una foto (máx. 4MB)
        </p>
      </div>

      <!-- Info Cards -->
      <div class="glass-card rounded-2xl p-4">
        <h3 class="font-semibold text-white mb-4">Información</h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between py-2 border-b border-surface-700">
            <span class="text-surface-400">Clase</span>
            <span class="text-white font-medium">{{ classroom.name }}</span>
          </div>

          <div class="flex items-center justify-between py-2 border-b border-surface-700">
            <span class="text-surface-400">Código de clase</span>
            <span class="text-white font-mono">{{ classroom.code }}</span>
          </div>

          <div class="flex items-center justify-between py-2 border-b border-surface-700">
            <span class="text-surface-400">Moneda</span>
            <span class="text-white">
              {{ classroom.currency_name }} {{ classroom.currency_symbol }}
            </span>
          </div>

          <div class="flex items-center justify-between py-2">
            <span class="text-surface-400">Balance actual</span>
            <span class="text-white font-bold text-lg">
              {{ wallet?.balance?.toLocaleString() }} {{ classroom.currency_symbol }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink
          to="/student/badges"
          class="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-surface-700/50 transition-colors"
        >
          <span class="text-2xl">🎖️</span>
          <div>
            <p class="font-medium text-white text-sm">Mis Insignias</p>
            <p class="text-xs text-surface-400">Ver logros</p>
          </div>
        </NuxtLink>

        <NuxtLink
          to="/student/savings"
          class="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-surface-700/50 transition-colors"
        >
          <span class="text-2xl">💰</span>
          <div>
            <p class="font-medium text-white text-sm">Mis CDTs</p>
            <p class="text-xs text-surface-400">Ver ahorros</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
