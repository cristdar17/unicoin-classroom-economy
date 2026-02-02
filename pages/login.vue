<script setup lang="ts">
import type { LoginRequest, RegisterRequest } from '~/types'

definePageMeta({
  layout: 'default',
})

const client = useSupabaseClient()
const user = useSupabaseUser()

// Redirect if already logged in
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/teacher')
  }
}, { immediate: true })

const isLogin = ref(true)
const loading = ref(false)
const error = ref('')

const form = reactive<RegisterRequest>({
  email: '',
  password: '',
  name: '',
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
}

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    if (isLogin.value) {
      // Login
      const { error: authError } = await client.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (authError) throw authError
    } else {
      // Register
      if (!form.name.trim()) {
        throw new Error('El nombre es requerido')
      }

      const { data, error: authError } = await client.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
          },
        },
      })
      if (authError) throw authError

      // Create teacher record
      if (data.user) {
        const { error: dbError } = await client.from('teachers').insert({
          id: data.user.id,
          email: form.email,
          name: form.name,
        })
        if (dbError) throw dbError
      }
    }

    navigateTo('/teacher')
  } catch (e: any) {
    error.value = e.message || 'Error de autenticación'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <!-- Back button -->
    <NuxtLink
      to="/"
      class="absolute top-4 left-4 text-surface-400 hover:text-white flex items-center gap-2"
    >
      <span>←</span>
      <span>Volver</span>
    </NuxtLink>

    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="text-4xl mb-2">👨‍🏫</div>
        <h1 class="text-2xl font-bold">
          {{ isLogin ? 'Ingresar como Docente' : 'Crear cuenta de Docente' }}
        </h1>
        <p class="text-surface-400 mt-2">
          {{ isLogin ? 'Ingresa a tu cuenta para gestionar tu economía de aula' : 'Registra tu cuenta para empezar' }}
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name (only for register) -->
        <div v-if="!isLogin">
          <label for="name" class="block text-sm font-medium text-surface-300 mb-1">
            Nombre
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Tu nombre completo"
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-surface-300 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="tu@email.com"
            required
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-surface-300 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            minlength="6"
            class="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- Error message -->
        <div v-if="error" class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
          {{ error }}
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <span v-if="loading">Cargando...</span>
          <span v-else>{{ isLogin ? 'Ingresar' : 'Crear cuenta' }}</span>
        </button>
      </form>

      <!-- Forgot password (only in login mode) -->
      <p v-if="isLogin" class="text-center mt-4">
        <NuxtLink
          to="/password-reset"
          class="text-surface-400 hover:text-primary-400 text-sm"
        >
          ¿Olvidaste tu contraseña?
        </NuxtLink>
      </p>

      <!-- Toggle mode -->
      <p class="text-center mt-4 text-surface-400">
        {{ isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?' }}
        <button
          @click="toggleMode"
          class="text-primary-400 hover:text-primary-300 font-medium ml-1"
        >
          {{ isLogin ? 'Regístrate' : 'Ingresar' }}
        </button>
      </p>
    </div>
  </div>
</template>
