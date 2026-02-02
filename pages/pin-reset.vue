<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const step = ref<'request' | 'confirm'>('request')
const loading = ref(false)
const error = ref('')
const success = ref(false)

// Request form
const requestForm = reactive({
  name: '',
  classroom_code: '',
  reason: '',
})

// Confirm form
const confirmForm = reactive({
  name: '',
  classroom_code: '',
  temp_code: '',
  new_pin: '',
  confirm_pin: '',
})

const formatPin = (e: Event) => {
  const input = e.target as HTMLInputElement
  const field = input.name as 'new_pin' | 'confirm_pin'
  confirmForm[field] = input.value.replace(/\D/g, '').slice(0, 4)
}

const formatTempCode = (e: Event) => {
  const input = e.target as HTMLInputElement
  confirmForm.temp_code = input.value.replace(/\D/g, '').slice(0, 6)
}

const handleRequest = async () => {
  if (!requestForm.name.trim() || !requestForm.classroom_code.trim()) {
    error.value = 'Completa todos los campos'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/auth/pin-reset-request', {
      method: 'POST',
      body: {
        name: requestForm.name,
        classroom_code: requestForm.classroom_code,
        reason: requestForm.reason || 'Olvidé mi PIN',
      },
    })

    success.value = true
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al enviar solicitud'
  } finally {
    loading.value = false
  }
}

const handleConfirm = async () => {
  if (!confirmForm.name.trim() || !confirmForm.classroom_code.trim()) {
    error.value = 'Completa todos los campos'
    return
  }

  if (confirmForm.temp_code.length !== 6) {
    error.value = 'El código temporal debe ser de 6 dígitos'
    return
  }

  if (confirmForm.new_pin.length !== 4) {
    error.value = 'El PIN debe ser de 4 dígitos'
    return
  }

  if (confirmForm.new_pin !== confirmForm.confirm_pin) {
    error.value = 'Los PINs no coinciden'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/auth/pin-reset-confirm', {
      method: 'POST',
      body: {
        name: confirmForm.name,
        classroom_code: confirmForm.classroom_code,
        temp_code: confirmForm.temp_code,
        new_pin: confirmForm.new_pin,
      },
    })

    success.value = true

    // Redirect to login after 3 seconds
    setTimeout(() => {
      navigateTo('/student-login')
    }, 3000)
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al actualizar PIN'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <!-- Back button -->
    <NuxtLink
      to="/student-login"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver al login</span>
    </NuxtLink>

    <div class="w-full max-w-sm">
      <!-- Tab selector -->
      <div v-if="!success" class="flex gap-2 mb-6">
        <button
          @click="step = 'request'; error = ''"
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          :class="step === 'request'
            ? 'bg-primary-500 text-white'
            : 'bg-surface-800 text-surface-400 hover:text-white'"
        >
          Solicitar
        </button>
        <button
          @click="step = 'confirm'; error = ''"
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          :class="step === 'confirm'
            ? 'bg-primary-500 text-white'
            : 'bg-surface-800 text-surface-400 hover:text-white'"
        >
          Tengo código
        </button>
      </div>

      <!-- Step 1: Request Reset -->
      <div v-if="step === 'request' && !success">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🔐</div>
          <h1 class="text-2xl font-bold">Olvidé mi PIN</h1>
          <p class="text-surface-400 mt-2">
            Envía una solicitud al docente para recuperar tu PIN
          </p>
        </div>

        <form @submit.prevent="handleRequest" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-surface-300 mb-1">
              Tu nombre (como lo registraste)
            </label>
            <input
              id="name"
              v-model="requestForm.name"
              type="text"
              placeholder="Juan Pérez"
              required
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="classroom_code" class="block text-sm font-medium text-surface-300 mb-1">
              Código de la clase
            </label>
            <input
              id="classroom_code"
              v-model="requestForm.classroom_code"
              type="text"
              placeholder="ABC123"
              required
              maxlength="6"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white uppercase text-center tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="reason" class="block text-sm font-medium text-surface-300 mb-1">
              Razón (opcional)
            </label>
            <textarea
              id="reason"
              v-model="requestForm.reason"
              placeholder="Olvidé mi PIN..."
              rows="2"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
            <span v-if="loading">Enviando...</span>
            <span v-else>Enviar solicitud</span>
          </button>
        </form>
      </div>

      <!-- Success message for request -->
      <div v-else-if="step === 'request' && success" class="text-center">
        <div class="text-6xl mb-4">📨</div>
        <h2 class="text-2xl font-bold text-white mb-2">Solicitud enviada</h2>
        <p class="text-surface-400 mb-6">
          El docente debe aprobar tu solicitud. Cuando lo haga, te dará un código temporal de 6 dígitos.
        </p>
        <button
          @click="step = 'confirm'; success = false"
          class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Ya tengo el código
        </button>
      </div>

      <!-- Step 2: Confirm with temp code -->
      <div v-else-if="step === 'confirm' && !success">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🔑</div>
          <h1 class="text-2xl font-bold">Crear nuevo PIN</h1>
          <p class="text-surface-400 mt-2">
            Ingresa el código que te dio el docente
          </p>
        </div>

        <form @submit.prevent="handleConfirm" class="space-y-4">
          <div>
            <label for="confirm_name" class="block text-sm font-medium text-surface-300 mb-1">
              Tu nombre
            </label>
            <input
              id="confirm_name"
              v-model="confirmForm.name"
              type="text"
              placeholder="Juan Pérez"
              required
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="confirm_code" class="block text-sm font-medium text-surface-300 mb-1">
              Código de la clase
            </label>
            <input
              id="confirm_code"
              v-model="confirmForm.classroom_code"
              type="text"
              placeholder="ABC123"
              required
              maxlength="6"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white uppercase text-center tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="temp_code" class="block text-sm font-medium text-surface-300 mb-1">
              Código temporal (6 dígitos)
            </label>
            <input
              id="temp_code"
              :value="confirmForm.temp_code"
              @input="formatTempCode"
              type="text"
              inputmode="numeric"
              placeholder="123456"
              required
              maxlength="6"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-center text-xl tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="new_pin" class="block text-sm font-medium text-surface-300 mb-1">
              Nuevo PIN (4 dígitos)
            </label>
            <input
              id="new_pin"
              name="new_pin"
              :value="confirmForm.new_pin"
              @input="formatPin"
              type="password"
              inputmode="numeric"
              placeholder="••••"
              required
              maxlength="4"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white text-center text-xl tracking-widest placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="confirm_pin" class="block text-sm font-medium text-surface-300 mb-1">
              Confirmar PIN
            </label>
            <input
              id="confirm_pin"
              name="confirm_pin"
              :value="confirmForm.confirm_pin"
              @input="formatPin"
              type="password"
              inputmode="numeric"
              placeholder="••••"
              required
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
            <span v-if="loading">Guardando...</span>
            <span v-else>Guardar nuevo PIN</span>
          </button>
        </form>
      </div>

      <!-- Success message for confirm -->
      <div v-else-if="step === 'confirm' && success" class="text-center">
        <div class="text-6xl mb-4">✅</div>
        <h2 class="text-2xl font-bold text-white mb-2">PIN actualizado</h2>
        <p class="text-surface-400 mb-6">
          Tu nuevo PIN ha sido guardado. Redirigiendo al login...
        </p>
        <div class="w-8 h-8 mx-auto border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  </div>
</template>
