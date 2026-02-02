import type { RealtimeChannel } from '@supabase/supabase-js'

export const useTeacherRealtime = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const pendingCount = useState<number>('pendingRequestsCount', () => 0)
  const newRequestNotification = useState<{ type: string; studentName: string; amount: number } | null>('newRequestNotification', () => null)

  let purchaseChannel: RealtimeChannel | null = null
  let transferChannel: RealtimeChannel | null = null

  const fetchPendingCount = async (classroomIds: string[]) => {
    if (!classroomIds.length) return

    const { count: purchaseCount } = await client
      .from('purchase_requests')
      .select('id', { count: 'exact', head: true })
      .in('classroom_id', classroomIds)
      .eq('status', 'PENDING')

    const { count: transferCount } = await client
      .from('transfer_requests')
      .select('id', { count: 'exact', head: true })
      .in('classroom_id', classroomIds)
      .eq('status', 'PENDING')

    pendingCount.value = (purchaseCount || 0) + (transferCount || 0)
  }

  const setupRealtimeSubscriptions = (classroomIds: string[]) => {
    if (!classroomIds.length) return

    // Cleanup existing subscriptions
    cleanupSubscriptions()

    // Subscribe to new purchase requests
    purchaseChannel = client
      .channel('teacher-purchase-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'purchase_requests',
        },
        async (payload) => {
          const request = payload.new as any
          if (classroomIds.includes(request.classroom_id) && request.status === 'PENDING') {
            pendingCount.value++

            // Get student name for notification
            const { data: student } = await client
              .from('students')
              .select('name')
              .eq('id', request.student_id)
              .single()

            newRequestNotification.value = {
              type: 'purchase',
              studentName: student?.name || 'Estudiante',
              amount: request.price,
            }

            // Auto-hide notification
            setTimeout(() => {
              newRequestNotification.value = null
            }, 5000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchase_requests',
        },
        (payload) => {
          const request = payload.new as any
          const oldRequest = payload.old as any
          if (classroomIds.includes(request.classroom_id)) {
            // If status changed from PENDING to something else, decrease count
            if (oldRequest.status === 'PENDING' && request.status !== 'PENDING') {
              pendingCount.value = Math.max(0, pendingCount.value - 1)
            }
          }
        }
      )
      .subscribe()

    // Subscribe to new transfer requests
    transferChannel = client
      .channel('teacher-transfer-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfer_requests',
        },
        async (payload) => {
          const request = payload.new as any
          if (classroomIds.includes(request.classroom_id) && request.status === 'PENDING') {
            pendingCount.value++

            // Get student name from wallet
            const { data: wallet } = await client
              .from('wallets')
              .select('students(name)')
              .eq('id', request.from_wallet_id)
              .single()

            newRequestNotification.value = {
              type: 'transfer',
              studentName: (wallet?.students as any)?.name || 'Estudiante',
              amount: request.amount,
            }

            // Auto-hide notification
            setTimeout(() => {
              newRequestNotification.value = null
            }, 5000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transfer_requests',
        },
        (payload) => {
          const request = payload.new as any
          const oldRequest = payload.old as any
          if (classroomIds.includes(request.classroom_id)) {
            if (oldRequest.status === 'PENDING' && request.status !== 'PENDING') {
              pendingCount.value = Math.max(0, pendingCount.value - 1)
            }
          }
        }
      )
      .subscribe()
  }

  const cleanupSubscriptions = () => {
    if (purchaseChannel) {
      client.removeChannel(purchaseChannel)
      purchaseChannel = null
    }
    if (transferChannel) {
      client.removeChannel(transferChannel)
      transferChannel = null
    }
  }

  const initialize = async () => {
    if (!user.value) return

    // Get teacher's classrooms
    const { data: classrooms } = await client
      .from('classrooms')
      .select('id')
      .eq('teacher_id', user.value.id)

    const classroomIds = (classrooms || []).map(c => c.id)

    if (classroomIds.length) {
      await fetchPendingCount(classroomIds)
      setupRealtimeSubscriptions(classroomIds)
    }
  }

  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanupSubscriptions()
  })

  return {
    pendingCount: readonly(pendingCount),
    newRequestNotification: readonly(newRequestNotification),
    refresh: initialize,
  }
}
