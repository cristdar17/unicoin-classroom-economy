export default defineNuxtRouteMiddleware((to) => {
  // Skip non-student routes and the login page itself
  if (!to.path.startsWith('/student') || to.path === '/student-login') return

  const studentToken = useStudentToken()

  // If no student token, redirect to student login
  if (!studentToken.value) {
    return navigateTo('/student-login')
  }
})
