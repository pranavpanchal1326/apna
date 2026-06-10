// src/hooks/useRealtime.ts
// Custom hook for subscribing to member locations in the Firebase Realtime Database.

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../lib/firebase/config'
import type { LocationUpdate, MemberLocation } from '../lib/types/location.types'
import { LOCATION_STATUS_THRESHOLDS } from '../lib/types/location.types'
import type { UserInput } from '../lib/schemas'

export function useGroupLocations(
  groupId: string | null,
  members: Map<string, UserInput>
): Map<string, MemberLocation> {
  const [locations, setLocations] = useState<Map<string, MemberLocation>>(new Map())

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

            // Skip if user turned off sharing (Ghost Mode)
            if (update.sharing === false) return

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
  }, [groupId, members])

  // Periodic timer to transition statuses locally between updates
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
