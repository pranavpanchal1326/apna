// src/navigation/deeplink/pendingStorage.ts
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'apna-pending-nav' })
const KEY = 'pending-navigation'

const TTL_MS = 10 * 60 * 1000

export interface NavigationTarget {
  type: string
  params: Record<string, string>
  raw_url: string
  stored_at?: number
  metadata?: Record<string, any>
}

export function setPendingNavigation(target: Omit<NavigationTarget, 'stored_at'>): void {
  const payload: NavigationTarget = {
    ...target,
    stored_at: Date.now(),
  }
  storage.set(KEY, JSON.stringify(payload))
}

export function getPendingNavigation(): NavigationTarget | null {
  const raw = storage.getString(KEY)
  if (!raw) return null

  try {
    const target = JSON.parse(raw) as NavigationTarget
    const storedAt = target.stored_at ?? Date.now()
    if (Date.now() - storedAt > TTL_MS) {
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
