// src/hooks/useRealtime.ts
// Custom hook for subscribing to member locations in the Firebase Realtime Database.
// Filters out:
//   - Users in Ghost Mode (sharing === false) unless it is the user themselves.
//   - Users who have explicitly excluded the current user from seeing their location.

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { doc, onSnapshot } from 'firebase/firestore'
import { rtdb, db } from '../lib/firebase/config'
import type { LocationUpdate, MemberLocation, GroupLocationVisibility } from '../lib/types/location.types'
import { LOCATION_STATUS_THRESHOLDS } from '../lib/types/location.types'
import type { UserInput } from '../lib/schemas'

export function useGroupLocations(
  groupId: string | null,
  members: Map<string, UserInput>,
  myUid: string
): Map<string, MemberLocation> {
  const [locations, setLocations] = useState<Map<string, MemberLocation>>(new Map())
  const [excludedBy, setExcludedBy] = useState<Set<string>>(new Set())

  // 1. Subscribe to group members' location privacy documents to track who excluded me
  useEffect(() => {
    if (!groupId || members.size === 0) {
      setExcludedBy(new Set())
      return
    }

    const unsubscribes: (() => void)[] = []
    const exclusionsMap = new Map<string, boolean>()

    members.forEach((_, memberId) => {
      if (memberId === myUid) return

      const privacyDocRef = doc(db, 'users', memberId, 'locationPrivacy', groupId)
      const unsub = onSnapshot(
        privacyDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as GroupLocationVisibility
            const isExcluded = data.shareWithAll === false && data.excludedMembers?.includes(myUid)
            exclusionsMap.set(memberId, isExcluded)
          } else {
            exclusionsMap.set(memberId, false)
          }

          // Compute new Set of users who excluded me
          const nextExclusions = new Set<string>()
          exclusionsMap.forEach((val, uid) => {
            if (val) nextExclusions.add(uid)
          })
          setExcludedBy(nextExclusions)
        },
        (err) => {
          console.warn(`[useGroupLocations] Error loading privacy settings for member=${memberId}:`, err)
        }
      )
      unsubscribes.push(unsub)
    })

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [groupId, members, myUid])

  // 2. Subscribe to locations in Realtime Database and filter
  useEffect(() => {
    if (!groupId) {
      setLocations(new Map())
      return
    }

    const locationsRef = ref(rtdb, `groups/${groupId}/locations`)

    const unsubscribe = onValue(
      locationsRef,
      (snapshot) => {
        const data = snapshot.val() as Record<string, LocationUpdate> | null
        const nextMap = new Map<string, MemberLocation>()

        if (data) {
          const now = Date.now()
          Object.entries(data).forEach(([userId, update]) => {
            // Resolve member profile
            const member = members.get(userId)
            if (!member) return

            // Safety check: Skip if user turned off sharing (Ghost Mode)
            // Rule: Current user can still see themselves on their own device
            if (update.sharing === false && userId !== myUid) return

            // Safety check: Skip if this user has excluded the current user
            if (userId !== myUid && excludedBy.has(userId)) return

            // Compute status
            const diff = now - update.timestamp
            let status: 'live' | 'recent' | 'offline' = 'offline'
            if (diff <= LOCATION_STATUS_THRESHOLDS.live) {
              status = 'live'
            } else if (diff <= LOCATION_STATUS_THRESHOLDS.recent) {
              status = 'recent'
            }

            nextMap.set(userId, {
              ...update,
              userId,
              name: member.name || 'Squad Member',
              avatarColor: member.avatarColor || '#4ECDC4',
              status,
            })
          })
        }
        setLocations(nextMap)
      },
      (err) => {
        console.error('[useGroupLocations] Realtime Database error:', err)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [groupId, members, myUid, excludedBy])

  // 3. Periodic timer to transition statuses locally between updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLocations((prev) => {
        if (prev.size === 0) return prev
        const now = Date.now()
        let changed = false
        const nextMap = new Map<string, MemberLocation>()

        prev.forEach((loc, userId) => {
          const diff = now - loc.timestamp
          let status: 'live' | 'recent' | 'offline' = 'offline'
          if (diff <= LOCATION_STATUS_THRESHOLDS.live) {
            status = 'live'
          } else if (diff <= LOCATION_STATUS_THRESHOLDS.recent) {
            status = 'recent'
          }

          if (status !== loc.status) {
            changed = true
          }
          nextMap.set(userId, { ...loc, status })
        })

        return changed ? nextMap : prev
      })
    }, 10000) // Recalculate status every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return locations
}
