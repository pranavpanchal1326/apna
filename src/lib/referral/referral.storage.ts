// src/lib/referral/referral.storage.ts
// Ephemeral referral context — survives onboarding, backgrounding, and auth delay.

import { createMMKV } from 'react-native-mmkv'
import type { PendingReferralContext } from '@lib/schemas/referral.schema'

const storage = createMMKV({ id: 'apna-referral' })
const PENDING_KEY = 'pending-referral'
const OPEN_COUNT_PREFIX = 'open-count-'

export function setPendingReferral(context: PendingReferralContext): void {
  storage.set(PENDING_KEY, JSON.stringify(context))
}

export function getPendingReferral(): PendingReferralContext | null {
  const raw = storage.getString(PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingReferralContext
  } catch {
    return null
  }
}

export function clearPendingReferral(): void {
  storage.remove(PENDING_KEY)
}

/** Lightweight client-side rate limit for repeated link opens */
export function incrementReferralOpenCount(code: string): number {
  const key = `${OPEN_COUNT_PREFIX}${code}`
  const count = (storage.getNumber(key) ?? 0) + 1
  storage.set(key, count)
  return count
}

export function resetReferralOpenCount(code: string): void {
  storage.remove(`${OPEN_COUNT_PREFIX}${code}`)
}
