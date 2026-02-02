<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const loading = ref(false)
const error = ref('')
const step = ref<'credentials' | 'classrooms'>('credentials')

const form = reactive({
  name: '',
  pin: '',
})

interface ClassroomOption {
  student_id: string
  classroom: {
    id: string
    name: string
    code: string
    currency_name: string
    currency_symbol: string
  }
}

const classrooms = ref<ClassroomOption[]>([])
const selecting = ref<string | null>(null)

// Format PIN input
const formatPin = (e: Event) => {
  const input = e.target as HTMLInputElement
  form.pin = input.value.replace(/\D/g, '').slice(0, 4)
}

const handleLogin = async () => {
  if (form.pin.length !== 4 || !form.name.trim()) {
    error.value = 'Completa todos los campos'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/auth/student-classrooms', {
      method: 'POST',
      body: {
        name: form.name,
        pin: form.pin,
      },
    })

    if (response.data?.classrooms?.length === 0) {
      error.value = 'No se encontraron clases'
      return
    }

    classrooms.value = response.data?.classrooms || []

    // If only one classroom, go directly
    if (classrooms.value.length === 1) {
      await selectClassroom(classrooms.value[0])
    } else {
      step.value = 'classrooms'
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Credenciales incorrectas'
  } finally {
    loading.value = false
  }
}

const selectClassroom = async (option: ClassroomOption) => {
  selecting.value = option.classroom.id
  error.value = ''

  try {
    const response = await $fetch('/api/auth/student-select-classroom', {
      method: 'POST',
      body: {
        student_id: option.student_id,
        classroom_id: option.classroom.id,
        pin: form.pin,
      },
    })

    if (response.data?.token) {
      const studentToken = useStudentToken()
      studentToken.value = response.data.token
      navigateTo('/student')
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Error al seleccionar clase'
  } finally {
    selecting.value = null
  }
}

const goBack = () => {
  step.value = 'credentials'
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <!-- Back button -->
    <button
      v-if="step === 'classrooms'"
      @click="goBack"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver</span>
    </button>
    <NuxtLink
      v-else
      to="/"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver</span>
    </NuxtLink>

    <div class="w-full max-w-sm">
      <!-- Step 1: Credentials -->
      <div v-if="step === 'credentials'">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🎓</div>
          <h1 class="text-2xl font-bold">Ingresar como Estudiante</h1>
          <p class="text-surface-400 mt-2">
            Ingresa tu nombre y PIN
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-surface-300 mb-1">
              Tu nombre (como lo registraste)
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Juan Pérez"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="pin" class="block text-sm font-medium text-surface-300 mb-1">
              Tu PIN
            </label>
            <input
              id="pin"
              :value="form.pin"
              @input="formatPin"
              type="password"
              inputmode="numeric"
              placeholder="••••"
              maxlength="4"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-center text-xl tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <span v-if="loading">Buscando...</span>
            <span v-else>Continuar</span>
          </button>
        </form>

        <!-- Forgot PIN -->
        <p class="text-center mt-4">
          <NuxtLink
            to="/pin-reset"
            class="text-surface-400 hover:text-primary-400 text-sm"
          >
            ¿Olvidaste tu PIN?
          </NuxtLink>
        </p>

        <p class="text-center mt-4 text-surface-400">
          ¿Primera vez?
          <NuxtLink
            to="/join"
            class="text-primary-400 hover:text-primary-300 font-medium ml-1"
          >
            Unirse a una clase
          </NuxtLink>
        </p>
      </div>

      <!-- Step 2: Select Classroom -->
      <div v-else>
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">📚</div>
          <h1 class="text-2xl font-bold">Selecciona tu clase</h1>
          <p class="text-surface-400 mt-2">
            Tienes {{ classrooms.length }} clases disponibles
          </p>
        </div>

        <div class="space-y-3">
          <button
            v-for="option in classrooms"
            :key="option.classroom.id"
            @click="selectClassroom(option)"
            :disabled="selecting !== null"
            class="w-full p-4 rounded-2xl text-left transition-all glass-card hover:bg-surface-700/50 disabled:opacity-50"
            :class="selecting === option.classroom.id && 'ring-2 ring-primary-500'"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-white">{{ option.classroom.name }}</h3>
                <p class="text-sm text-surface-400">
                  {{ option.classroom.currency_name }} {{ option.classroom.currency_symbol }}
                </p>
              </div>
              <div v-if="selecting === option.classroom.id" class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span v-else class="text-surface-500">→</span>
            </div>
          </button>
        </div>

        <div v-if="error" class="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>
