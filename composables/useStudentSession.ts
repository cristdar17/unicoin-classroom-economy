import type { Student, Wallet, Classroom } from '~/types'

interface StudentNotification {
  show: boolean
  type: 'coins_received' | 'purchase_approved' | 'purchase_rejected' | 'transfer_approved' | 'transfer_rejected'
  amount?: number
  message?: string
  itemName?: string
}

export const useStudentSession = () => {
  const student = useState<Student | null>('student', () => null)
  const wallet = useState<Wallet | null>('wallet', () => null)
  const classroom = useState<Classroom | null>('classroom', () => null)
  const loading = useState('studentLoading', () => true)
  const error = useState<string | null>('studentError', () => null)

  const studentToken = useStudentToken()

  // Notification state
  const notification = useState<StudentNotification | null>('studentNotification', () => null)

  // Track which notifications we've already shown (by request ID)
  const shownNotificationIds = useState<Set<string>>('shownNotificationIds', () => new Set())

  const showNotification = (notif: Omit<StudentNotification, 'show'>) => {
    notification.value = { ...notif, show: true }

    setTimeout(() => {
      if (notification.value) {
        notification.value = { ...notification.value, show: false }
      }
    }, 4000)
  }

  const fetchSession = async () => {
    if (!studentToken.value) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/auth/student-session', {
        headers: {
          Authorization: `Bearer ${studentToken.value}`,
        },
      })

      if (response.error) {
        throw new Error(response.error)
      }

      student.value = response.data?.student || null
      wallet.value = response.data?.wallet || null
      classroom.value = response.data?.classroom || null
    } catch (e: any) {
      console.error('Session error:', e)
      error.value = e.message
      studentToken.value = null
      student.value = null
      wallet.value = null
      classroom.value = null
    } finally {
      loading.value = false
    }
  }

  // Check for updates (balance and request status changes)
  const checkForUpdates = async () => {
    if (!wallet.value || !student.value || !studentToken.value) return

    try {
      // 1. Check wallet balance
      const sessionResponse = await $fetch('/api/auth/student-session', {
        headers: { Authorization: `Bearer ${studentToken.value}` },
      })

      if (sessionResponse.data?.wallet) {
        const newBalance = sessionResponse.data.wallet.balance
        const oldBalance = wallet.value.balance

        if (newBalance !== oldBalance) {
          const balanceDiff = newBalance - oldBalance
          wallet.value = { ...wallet.value, balance: newBalance }

          // Only show notification for balance increase (coins received)
          if (balanceDiff > 0) {
            showNotification({
              type: 'coins_received',
              amount: balanceDiff,
            })
          }
        }
      }

      // 2. Check for resolved requests
      const requestsResponse = await $fetch('/api/student/my-requests', {
        headers: { Authorization: `Bearer ${studentToken.value}` },
      }).catch(() => null)

      if (requestsResponse?.data?.recently_resolved) {
        for (const resolved of requestsResponse.data.recently_resolved) {
          // Skip if we've already shown this notification
          if (shownNotificationIds.value.has(resolved.id)) {
            continue
          }

          // Mark as shown
          shownNotificationIds.value.add(resolved.id)

          // Show notification
          if (resolved.type === 'purchase') {
            if (resolved.status === 'APPROVED') {
              showNotification({
                type: 'purchase_approved',
                itemName: resolved.item_name,
                amount: resolved.price,
              })
            } else if (resolved.status === 'REJECTED') {
              showNotification({
                type: 'purchase_rejected',
                itemName: resolved.item_name,
                message: resolved.rejection_reason,
              })
            }
          } else if (resolved.type === 'transfer') {
            if (resolved.status === 'APPROVED') {
              showNotification({
                type: 'transfer_approved',
                amount: resolved.amount,
              })
            } else if (resolved.status === 'REJECTED') {
              showNotification({
                type: 'transfer_rejected',
                amount: resolved.amount,
                message: resolved.rejection_reason,
              })
            }
          }

          // Only show one notification at a time
          break
        }
      }

      // Cleanup old notification IDs (keep only last 50)
      if (shownNotificationIds.value.size > 50) {
        const ids = Array.from(shownNotificationIds.value)
        shownNotificationIds.value = new Set(ids.slice(-50))
      }
    } catch (e) {
      console.error('Polling error:', e)
    }
  }

  // Polling
  let pollInterval: ReturnType<typeof setInterval> | null = null

  const startPolling = () => {
    if (pollInterval) return

    // Initial check
    setTimeout(() => checkForUpdates(), 1000)

    // Poll every 5 seconds
    pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }, 5000)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  const refresh = async () => {
    await fetchSession()
  }

  const logout = () => {
    stopPolling()
    studentToken.value = null
    student.value = null
    wallet.value = null
    classroom.value = null
    shownNotificationIds.value = new Set()
    navigateTo('/')
  }

  onMounted(() => {
    if (!student.value && studentToken.value) {
      fetchSession()
    } else if (!studentToken.value) {
      loading.value = false
    }

    startPolling()

    // Refresh when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && studentToken.value) {
        checkForUpdates()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    student: readonly(student),
    wallet,
    classroom: readonly(classroom),
    loading: readonly(loading),
    error: readonly(error),
    notification: readonly(notification),
    refresh,
    logout,
  }
}
