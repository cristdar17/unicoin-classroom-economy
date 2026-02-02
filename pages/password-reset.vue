<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const client = useSupabaseClient()
const route = useRoute()

const step = ref<'request' | 'confirm'>('request')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Check if we have a recovery token in the URL
onMounted(() => {
  // Supabase handles the token automatically via the URL hash
  // If there's a recovery event, we can set up the new password
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = hashParams.get('access_token')
  const type = hashParams.get('type')

  if (accessToken && type === 'recovery') {
    step.value = 'confirm'
  }
})

const handleRequestReset = async () => {
  if (!email.value) {
    error.value = 'Ingresa tu email'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const { error: resetError } = await client.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/password-reset`,
    })

    if (resetError) throw resetError

    success.value = true
  } catch (e: any) {
    error.value = e.message || 'Error al enviar email de recuperación'
  } finally {
    loading.value = false
  }
}

const handleConfirmReset = async () => {
  if (newPassword.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  error.value = ''
  loading.value = true

  try {
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword.value,
    })

    if (updateError) throw updateError

    success.value = true

    // Redirect to login after 3 seconds
    setTimeout(() => {
      navigateTo('/login')
    }, 3000)
  } catch (e: any) {
    error.value = e.message || 'Error al actualizar contraseña'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <!-- Back button -->
    <NuxtLink
      to="/login"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver al login</span>
    </NuxtLink>

    <div class="w-full max-w-sm">
      <!-- Step 1: Request Reset -->
      <div v-if="step === 'request' && !success">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🔐</div>
          <h1 class="text-2xl font-bold">Recuperar Contraseña</h1>
          <p class="text-surface-400 mt-2">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form @submit.prevent="handleRequestReset" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-surface-300 mb-1">
              Email de tu cuenta
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              required
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            <span v-else>Enviar enlace de recuperación</span>
          </button>
        </form>
      </div>

      <!-- Success message for request -->
      <div v-else-if="step === 'request' && success" class="text-center">
        <div class="text-6xl mb-4">📧</div>
        <h2 class="text-2xl font-bold text-white mb-2">Email enviado</h2>
        <p class="text-surface-400 mb-6">
          Revisa tu bandeja de entrada (y spam) para encontrar el enlace de recuperación.
        </p>
        <NuxtLink
          to="/login"
          class="inline-flex items-center gap-2 px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-xl font-medium transition-colors"
        >
          Volver al login
        </NuxtLink>
      </div>

      <!-- Step 2: Confirm New Password -->
      <div v-else-if="step === 'confirm' && !success">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🔑</div>
          <h1 class="text-2xl font-bold">Nueva Contraseña</h1>
          <p class="text-surface-400 mt-2">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form @submit.prevent="handleConfirmReset" class="space-y-4">
          <div>
            <label for="newPassword" class="block text-sm font-medium text-surface-300 mb-1">
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="••••••••"
              required
              minlength="6"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-surface-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minlength="6"
              class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            <span v-else>Actualizar contraseña</span>
          </button>
        </form>
      </div>

      <!-- Success message for confirm -->
      <div v-else-if="step === 'confirm' && success" class="text-center">
        <div class="text-6xl mb-4">✅</div>
        <h2 class="text-2xl font-bold text-white mb-2">Contraseña actualizada</h2>
        <p class="text-surface-400 mb-6">
          Tu contraseña ha sido cambiada exitosamente. Redirigiendo al login...
        </p>
        <div class="w-8 h-8 mx-auto border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  </div>
</template>
