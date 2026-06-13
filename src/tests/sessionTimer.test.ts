jest.mock('react-native-mmkv', () => {
  const store = new Map<string, any>()
  return {
    createMMKV: () => ({
      set: (key: string, val: any) => store.set(key, val),
      getString: (key: string) => store.get(key),
      getNumber: (key: string) => store.get(key),
      getBoolean: (key: string) => store.get(key),
      contains: (key: string) => store.has(key),
      remove: (key: string) => store.delete(key),
      delete: (key: string) => store.delete(key),
      clearAll: () => store.clear(),
    }),
  }
})

import { sessionTimer } from '../lib/location/sessionTimer'

describe('Session Timer', () => {
  let dateSpy: jest.SpyInstance
  let mockTime = 1600000000000 // A fixed start timestamp

  beforeEach(() => {
    jest.resetModules()
    // Mock Date.now() to return a controllable value
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockTime)
    
    // Clear storage by calling clear
    sessionTimer.clear()
  })

  afterEach(() => {
    dateSpy.mockRestore()
  })

  test('default state has expired = true and startedAt = null', () => {
    expect(sessionTimer.isExpired()).toBe(true)
    expect(sessionTimer.remainingMs()).toBe(0)
    expect(sessionTimer.startedAt()).toBeNull()
  })

  test('start sets startedAt to current time', () => {
    sessionTimer.start()
    expect(sessionTimer.startedAt()).toBe(mockTime)
    expect(sessionTimer.isExpired()).toBe(false)
  })

  test('remainingMs counts down and isExpired checks 4-hour limit', () => {
    sessionTimer.start()
    
    // Check immediately
    expect(sessionTimer.remainingMs()).toBe(4 * 60 * 60 * 1000)
    expect(sessionTimer.isExpired()).toBe(false)

    // Advance 2 hours
    mockTime += 2 * 60 * 60 * 1000
    expect(sessionTimer.remainingMs()).toBe(2 * 60 * 60 * 1000)
    expect(sessionTimer.isExpired()).toBe(false)

    // Advance to 4 hours and 1 millisecond
    mockTime += 2 * 60 * 60 * 1000 + 1
    expect(sessionTimer.remainingMs()).toBe(0)
    expect(sessionTimer.isExpired()).toBe(true)
  })

  test('clear removes the session state', () => {
    sessionTimer.start()
    expect(sessionTimer.startedAt()).toBe(mockTime)
    
    sessionTimer.clear()
    expect(sessionTimer.startedAt()).toBeNull()
    expect(sessionTimer.isExpired()).toBe(true)
    expect(sessionTimer.remainingMs()).toBe(0)
  })
})
