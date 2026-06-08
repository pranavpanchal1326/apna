// src/hooks/useGroupMembers.ts
// Fetch and cache member profiles for a group.
// Fetches only users not already in the cache — avoids re-fetching known profiles.
// Returns a map: uid → UserInput for O(1) lookup in feed items.

import { useEffect, useState, useCallback } from 'react'
import { getDocs, query, where, documentId } from 'firebase/firestore'
import { usersCol } from '@lib/firebase/collections'
import type { UserInput } from '@lib/schemas'
import { captureError } from '@lib/sentry'

// Module-level cache — persists across component mounts within session
const profileCache = new Map<string, UserInput>()

export function useGroupMembers(memberIds: string[]) {
  const [members, setMembers] = useState<Map<string, UserInput>>(
    new Map(profileCache)
  )
  const [isLoading, setIsLoading] = useState(false)

  const fetchMissing = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !profileCache.has(id))
    if (missing.length === 0) return

    setIsLoading(true)
    try {
      // Chunk by 30 (Firestore 'in' limit)
      const chunks: string[][] = []
      for (let i = 0; i < missing.length; i += 30) {
        chunks.push(missing.slice(i, i + 30))
      }

      for (const chunk of chunks) {
        const q    = query(usersCol(), where(documentId(), 'in', chunk))
        const snap = await getDocs(q)
        snap.docs.forEach((d) => {
          const user = d.data() as UserInput
          profileCache.set(user.uid, user)
        })
      }

      setMembers(new Map(profileCache))
    } catch (err) {
      captureError(err, { source: 'useGroupMembers.fetchMissing' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (memberIds.length > 0) fetchMissing(memberIds)
  }, [memberIds.join(',')])

  return { members, isLoading }
}
