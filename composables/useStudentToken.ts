// Composable for consistent student token cookie management
export const useStudentToken = () => {
  // 30 days expiration
  const cookie = useCookie('student_token', {
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
    path: '/',
    sameSite: 'lax',
  })

  return cookie
}
