<script setup lang="ts">
import type { JoinClassroomRequest } from '~/types'

definePageMeta({
  layout: 'default',
})

const loading = ref(false)
const error = ref('')
const step = ref<'code' | 'info'>('code')

const form = reactive<JoinClassroomRequest>({
  code: '',
  name: '',
  pin: '',
})

const classroomInfo = ref<{ name: string; currency_name: string; currency_symbol: string } | null>(null)

// Format code input (uppercase, no spaces)
const formatCode = (e: Event) => {
  const input = e.target as HTMLInputElement
  form.code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

// Format PIN input (numbers only, 4 digits)
const formatPin = (e: Event) => {
  const input = e.target as HTMLInputElement
  form.pin = input.value.replace(/\D/g, '').slice(0, 4)
}

const checkCode = async () => {
  if (form.code.length !== 6) {
    error.value = 'El código debe tener 6 caracteres'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/auth/check-code', {
      method: 'POST',
      body: { code: form.code },
    })

    if (response.error) {
      throw new Error(response.error)
    }

    classroomInfo.value = response.data
    step.value = 'info'
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Código no válido'
  } finally {
    loading.value = false
  }
}

const handleJoin = async () => {
  if (form.pin.length !== 4) {
    error.value = 'El PIN debe tener 4 dígitos'
    return
  }

  if (!form.name.trim()) {
    error.value = 'El nombre es requerido'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/auth/join', {
      method: 'POST',
      body: form,
    })

    if (response.error) {
      throw new Error(response.error)
    }

    // Store student session token
    const studentToken = useStudentToken()
    studentToken.value = response.data?.token

    navigateTo('/student')
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al unirse'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  step.value = 'code'
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <!-- Back button -->
    <NuxtLink
      v-if="step === 'code'"
      to="/"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver</span>
    </NuxtLink>
    <button
      v-else
      @click="goBack"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver</span>
    </button>

    <div class="w-full max-w-sm">
      <!-- Step 1: Enter code -->
      <div v-if="step === 'code'">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🎓</div>
          <h1 class="text-2xl font-bold">Unirse a una clase</h1>
          <p class="text-surface-400 mt-2">
            Ingresa el código que te dio tu profesor
          </p>
        </div>

        <form @submit.prevent="checkCode" class="space-y-4">
          <div>
            <label for="code" class="block text-sm font-medium text-surface-300 mb-1">
              Código de clase
            </label>
            <input
              id="code"
              :value="form.code"
              @input="formatCode"
              type="text"
              placeholder="ABC123"
              maxlength="6"
              class="w-full px-4 py-4 bg-surface-800 border border-surface-600 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
            />
          </div>

          <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading || form.code.length !== 6"
            class="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <span v-if="loading">Verificando...</span>
            <span v-else>Continuar</span>
          </button>
        </form>
      </div>

      <!-- Step 2: Enter name and PIN -->
      <div v-else>
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">{{ classroomInfo?.currency_symbol || '🪙' }}</div>
          <h1 class="text-2xl font-bold">{{ classroomInfo?.name }}</h1>
          <p class="text-surface-400 mt-2">
            Moneda: {{ classroomInfo?.currency_name }}
          </p>
        </div>

        <form @submit.prevent="handleJoin" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-surface-300 mb-1">
              Tu nombre
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Juan Pérez"
              required
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="pin" class="block text-sm font-medium text-surface-300 mb-1">
              Crea un PIN de 4 dígitos
            </label>
            <input
              id="pin"
              :value="form.pin"
              @input="formatPin"
              type="password"
              inputmode="numeric"
              placeholder="••••"
              maxlength="4"
              class="w-full px-4 py-4 bg-surface-800 border border-surface-600 rounded-xl text-white text-center text-2xl tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p class="text-xs text-surface-500 mt-1">
              Recuerda este PIN para ingresar después
            </p>
          </div>

          <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading || form.pin.length !== 4 || !form.name.trim()"
            class="w-full bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <span v-if="loading">Uniéndose...</span>
            <span v-else>Unirse a la clase</span>
          </button>
        </form>
      </div>

      <!-- Already have account? -->
      <p class="text-center mt-6 text-surface-400">
        ¿Ya tienes cuenta?
        <NuxtLink
          to="/student-login"
          class="text-primary-400 hover:text-primary-300 font-medium ml-1"
        >
          Ingresar
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
