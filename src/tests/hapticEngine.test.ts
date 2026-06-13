jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 31,
    select: jest.fn((obj) => obj.android || obj.default),
  },
}))

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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}))

describe('Haptic Engine', () => {
  let hapticEngine: any

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    hapticEngine = require('../lib/haptics/engine').hapticEngine
  })

  test('isEnabled returns false when MMKV key is false', () => {
    hapticEngine.setEnabled(false)
    expect(hapticEngine.isEnabled()).toBe(false)
  })

  test('isEnabled returns true by default or when key is set to true', async () => {
    // Enable haptic engine
    hapticEngine.setEnabled(true)
    
    // Trigger init to check capabilities
    await hapticEngine.init()
    
    // isEnabled should return true on mock platforms where capability !== 'none'
    expect(hapticEngine.isEnabled()).toBe(true)
  })

  test('init with no haptic support sets capability to none', async () => {
    const Haptics = require('expo-haptics')
    Haptics.isAvailableAsync.mockResolvedValueOnce(false)
    
    await hapticEngine.init()
    expect(hapticEngine.isEnabled()).toBe(false)
  })

  test('all pattern calls return void without throwing when disabled', async () => {
    hapticEngine.setEnabled(false)
    
    await expect(hapticEngine.impactLight()).resolves.toBeUndefined()
    await expect(hapticEngine.impactMedium()).resolves.toBeUndefined()
    await expect(hapticEngine.impactHeavy()).resolves.toBeUndefined()
    await expect(hapticEngine.notificationSuccess()).resolves.toBeUndefined()
  })
})
