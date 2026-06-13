jest.mock('react-native-mmkv', () => {
  let store: Record<string, string> = {}
  return {
    createMMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => store[key],
      getNumber: (key: string) => Number(store[key]) || 0,
      set: (key: string, val: any) => { store[key] = String(val) },
      remove: (key: string) => { delete store[key] },
      delete: (key: string) => { delete store[key] },
    }))
  }
})

import { sessionTimer } from '@/lib/location/sessionTimer'

describe('Session Timer', () => {
  beforeEach(() => {
    sessionTimer.clear()
  })

  test('isExpired returns true when key is missing', () => {
    expect(sessionTimer.isExpired()).toBe(true)
  })

  test('isExpired returns false immediately after start', () => {
    sessionTimer.start()
    expect(sessionTimer.isExpired()).toBe(false)
  })

  test('isExpired returns true after 4 hours', () => {
    // Mock: started 4h + 1 second ago
    const past = Date.now() - (4 * 60 * 60 * 1000 + 1000)
    sessionTimer['storage'].set('location_session_start_ms', past)
    expect(sessionTimer.isExpired()).toBe(true)
  })

  test('remainingMs is never negative', () => {
    const past = Date.now() - (5 * 60 * 60 * 1000)
    sessionTimer['storage'].set('location_session_start_ms', past)
    expect(sessionTimer.remainingMs()).toBe(0)
  })

  test('clear removes key — isExpired returns true', () => {
    sessionTimer.start()
    sessionTimer.clear()
    expect(sessionTimer.isExpired()).toBe(true)
  })

  test('startedAt returns null when not started', () => {
    expect(sessionTimer.startedAt()).toBeNull()
  })

  test('startedAt returns timestamp after start', () => {
    const before = Date.now()
    sessionTimer.start()
    const started = sessionTimer.startedAt()
    expect(started).toBeGreaterThanOrEqual(before)
  })
})
