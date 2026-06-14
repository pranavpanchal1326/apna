// src/tests/deeplinkPending.test.ts
jest.mock('react-native-mmkv', () => {
  let store: Record<string, string> = {}
  return {
    createMMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => store[key],
      set: (key: string, val: any) => { store[key] = String(val) },
      remove: (key: string) => { delete store[key] },
      delete: (key: string) => { delete store[key] },
      clearAll: () => { store = {} }
    }))
  }
})

import {
  setPendingNavigation,
  getPendingNavigation,
  clearPendingNavigation,
  hasPendingNavigation,
  NavigationTarget
} from '../navigation/deeplink/pendingStorage'

describe('Pending Navigation Storage', () => {
  beforeEach(() => {
    clearPendingNavigation()
  })

  test('set and get pending navigation', () => {
    const target: Omit<NavigationTarget, 'stored_at'> = {
      type: 'group_invite',
      params: { code: 'GOA26A' },
      raw_url: 'apna://join?code=GOA26A'
    }

    setPendingNavigation(target)
    expect(hasPendingNavigation()).toBe(true)

    const retrieved = getPendingNavigation()
    expect(retrieved).not.toBeNull()
    expect(retrieved!.type).toBe('group_invite')
    expect(retrieved!.params.code).toBe('GOA26A')
    expect(retrieved!.raw_url).toBe('apna://join?code=GOA26A')
    expect(retrieved!.stored_at).toBeGreaterThan(0)
  })

  test('clearing pending navigation', () => {
    setPendingNavigation({
      type: 'group_direct',
      params: { groupId: 'g1' },
      raw_url: 'apna://group/g1'
    })
    expect(hasPendingNavigation()).toBe(true)

    clearPendingNavigation()
    expect(hasPendingNavigation()).toBe(false)
    expect(getPendingNavigation()).toBeNull()
  })

  test('expired target (TTL > 10m) returns null and is cleared', () => {
    const target: Omit<NavigationTarget, 'stored_at'> = {
      type: 'group_invite',
      params: { code: 'GOA26A' },
      raw_url: 'apna://join?code=GOA26A'
    }

    setPendingNavigation(target)

    // Mock expiration by modifying stored_at manually in storage
    const mmkvInstance = require('react-native-mmkv').createMMKV()
    const stored = JSON.parse(mmkvInstance.getString('pending-navigation'))
    stored.stored_at = Date.now() - (11 * 60 * 1000) // 11 minutes ago
    mmkvInstance.set('pending-navigation', JSON.stringify(stored))

    expect(getPendingNavigation()).toBeNull()
    expect(hasPendingNavigation()).toBe(false)
  })
})
