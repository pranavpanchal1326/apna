import { createMMKV } from 'react-native-mmkv'

const locationTimerStorage = createMMKV({ id: 'apna-location-timer' })
const SESSION_START_KEY = 'location_session_start_ms'
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000  // 4 hours exactly

export const sessionTimer = {
  start(): void {
    locationTimerStorage.set(SESSION_START_KEY, Date.now())
  },
  clear(): void {
    locationTimerStorage.remove(SESSION_START_KEY)
  },
  isExpired(): boolean {
    const started = locationTimerStorage.getNumber(SESSION_START_KEY)
    if (!started) return true // expired = safe default
    return Date.now() - started > SESSION_DURATION_MS
  },
  remainingMs(): number {
    const started = locationTimerStorage.getNumber(SESSION_START_KEY)
    if (!started) return 0
    const elapsed = Date.now() - started
    const remaining = SESSION_DURATION_MS - elapsed
    return Math.max(0, remaining)
  },
  startedAt(): number | null {
    const started = locationTimerStorage.getNumber(SESSION_START_KEY)
    return started || null
  },
}
