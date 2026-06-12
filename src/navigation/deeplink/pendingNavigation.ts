// src/navigation/deeplink/pendingNavigation.ts
// Stores a deep link target across auth flows using MMKV.
// Written when an unauthenticated user opens a protected deep link.
// Consumed once by RootNavigator after authentication completes.

import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'apna-pending-nav' })
const KEY = 'pending-navigation'

// 10-minute TTL — stale targets are cleared automatically
const TTL_MS = 10 * 60 * 1000

export interface PendingNavTarget {
  /** deep link type, e.g. 'group_invite' */
  type: string
  /** parsed route params */
  params: Record<string, string>
  /** original URL for re-parsing if needed */
  raw_url: string
  /** unix ms when stored */
  stored_at: number
}

export function setPendingNavigation(target: Omit<PendingNavTarget, 'stored_at'>): void {
  const payload: PendingNavTarget = { ...target, stored_at: Date.now() }
  storage.set(KEY, JSON.stringify(payload))
}

export function getPendingNavigation(): PendingNavTarget | null {
  const raw = storage.getString(KEY)
  if (!raw) return null

  try {
    const target = JSON.parse(raw) as PendingNavTarget
    // Clear if expired
    if (Date.now() - target.stored_at > TTL_MS) {
      clearPendingNavigation()
      return null
    }
    return target
  } catch {
    clearPendingNavigation()
    return null
  }
}

export function clearPendingNavigation(): void {
  storage.remove(KEY)
}

export function hasPendingNavigation(): boolean {
  return getPendingNavigation() !== null
}
