export default defineNuxtRouteMiddleware((to) => {
  // Only protect teacher routes
  if (!to.path.startsWith('/teacher')) return

  const user = useSupabaseUser()

  // If not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }
})
