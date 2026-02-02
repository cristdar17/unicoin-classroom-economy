// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
  ],

  // Supabase config - set these in .env
  supabase: {
    redirect: false, // Disable automatic redirects, we handle auth manually
  },

  // PWA config for mobile experience
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'UniCoin - Economía de Aula',
      short_name: 'UniCoin',
      description: 'Sistema de economía gamificada para el aula',
      theme_color: '#6366f1',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  // App config
  app: {
    head: {
      title: 'UniCoin',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'theme-color', content: '#6366f1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  // Runtime config for env variables
  runtimeConfig: {
    // Server-side only
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    // Public (client-side)
    public: {
      appName: 'UniCoin',
    },
  },

  // TypeScript strict mode
  typescript: {
    strict: true,
  },
})
