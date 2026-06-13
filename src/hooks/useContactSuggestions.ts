import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getContactsPermissionStatus,
  requestContactsPermission,
  matchContacts,
  type MatchedUser,
  type ContactsPermissionStatus,
} from '../lib/contacts'
import { useAuth } from './useAuth'
import { useGroupStore } from '../stores/group.store'

export interface UseContactSuggestionsResult {
  suggestions: MatchedUser[]
  isLoading: boolean
  permissionStatus: ContactsPermissionStatus
  hasPermission: boolean
  error: string | null
  requestPermission(): Promise<void>
  refresh(): Promise<void>
  addMember(user: MatchedUser): Promise<void>
  removeSuggestion(uid: string): void
}

export function useContactSuggestions(params: {
  groupId: string
  existingMemberIds: string[]
}): UseContactSuggestionsResult {
  const { groupId, existingMemberIds } = params
  const { user } = useAuth()
  const currentUserId = user?.uid ?? ''
  const addGroupMember = useGroupStore((s) => s.addMember)

  const [suggestions, setSuggestions] = useState<MatchedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<ContactsPermissionStatus>('undetermined')
  const [error, setError] = useState<string | null>(null)

  const dismissedUids = useRef<Set<string>>(new Set())

  const hasPermission = permissionStatus === 'granted'

  const fetchSuggestions = useCallback(
    async (force = false) => {
      if (!currentUserId || !groupId) return
      setIsLoading(true)
      setError(null)
      try {
        const result = await matchContacts({
          groupId,
          existingMemberIds,
          currentUserId,
          forceRefresh: force,
        })
        
        // Filter out dismissed uids
        const activeSuggestions = result.matches.filter(
          (m) => !dismissedUids.current.has(m.uid)
        )
        setSuggestions(activeSuggestions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions')
      } finally {
        setIsLoading(false)
      }
    },
    [groupId, existingMemberIds, currentUserId]
  )

  // Check permission on mount
  useEffect(() => {
    async function checkPermission() {
      const status = await getContactsPermissionStatus()
      setPermissionStatus(status)
      if (status === 'granted') {
        fetchSuggestions(false)
      }
    }
    checkPermission()
  }, [fetchSuggestions])

  const requestPermission = useCallback(async () => {
    setError(null)
    try {
      const granted = await requestContactsPermission()
      const status: ContactsPermissionStatus = granted ? 'granted' : 'denied'
      setPermissionStatus(status)
      if (granted) {
        await fetchSuggestions(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed')
    }
  }, [fetchSuggestions])

  const refresh = useCallback(async () => {
    if (permissionStatus === 'granted') {
      await fetchSuggestions(true)
    }
  }, [permissionStatus, fetchSuggestions])

  const addMember = useCallback(
    async (matchedUser: MatchedUser) => {
      try {
        await addGroupMember(groupId, matchedUser.uid)
        // Remove from local suggestions list
        setSuggestions((prev) => prev.filter((s) => s.uid !== matchedUser.uid))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add member')
        throw err
      }
    },
    [groupId, addGroupMember]
  )

  const removeSuggestion = useCallback((uid: string) => {
    dismissedUids.current.add(uid)
    setSuggestions((prev) => prev.filter((s) => s.uid !== uid))
  }, [])

  return {
    suggestions,
    isLoading,
    permissionStatus,
    hasPermission,
    error,
    requestPermission,
    refresh,
    addMember,
    removeSuggestion,
  }
}
