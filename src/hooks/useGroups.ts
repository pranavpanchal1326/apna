// src/hooks/useGroups.ts
// Groups hook — loads groups on mount, subscribes to active group in real-time.

import { useEffect } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from './useAuth'
import { groupDoc } from '@lib/firebase/collections'
import { captureError } from '@lib/sentry'

export function useGroups() {
  const { user } = useAuth()
  const store = useGroupStore()

  // Load user's groups when component mounts or user changes
  useEffect(() => {
    if (!user?.groups?.length) {
      useGroupStore.getState().reset()
      return
    }
    store.loadGroups(user.groups)
  }, [user?.uid, user?.groups?.join(',')])

  return {
    groups:      store.groups,
    isLoading:   store.isLoading,
    error:       store.error,
    createGroup: store.createGroup,
    joinGroup:   store.joinGroup,
    isCreating:  store.isCreating,
    isJoining:   store.isJoining,
  }
}

/**
 * Subscribe to real-time updates for a single group.
 * Use inside GroupHomeScreen and any screen showing live group data.
 */
export function useActiveGroup(groupId: string | null) {
  const setActiveGroup     = useGroupStore((s) => s.setActiveGroup)
  const updateGroupInCache = useGroupStore((s) => s.updateGroupInCache)
  const activeGroup        = useGroupStore((s) => s.activeGroup)

  useEffect(() => {
    if (!groupId) return

    const unsub = onSnapshot(
      groupDoc(groupId),
      (snap) => {
        if (snap.exists()) {
          const group = snap.data()
          setActiveGroup(group)
          updateGroupInCache(group)
        }
      },
      (err) => {
        captureError(err, { source: 'useActiveGroup', groupId })
      }
    )

    return () => unsub()
  }, [groupId])

  return activeGroup
}
