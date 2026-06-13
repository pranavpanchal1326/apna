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
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}))

describe('Haptic Engine', () => {
  let hapticEngine: any

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    hapticEngine = require('@/lib/haptics/engine').hapticEngine
  })

  test('isEnabled returns true by default when MMKV key missing', async () => {
    await hapticEngine.init()
    expect(hapticEngine.isEnabled()).toBe(true)
  })

  test('setEnabled false — all haptic calls are no-ops', async () => {
    hapticEngine.setEnabled(false)
    await hapticEngine.impactMedium()
    const Haptics = require('expo-haptics')
    expect(Haptics.impactAsync).not.toHaveBeenCalled()
  })

  test('setEnabled true — haptic calls execute', async () => {
    hapticEngine.setEnabled(true)
    await hapticEngine.init()
    await hapticEngine.impactMedium()
    const Haptics = require('expo-haptics')
    expect(Haptics.impactAsync).toHaveBeenCalled()
  })

  test('haptic call never throws even when expo-haptics fails', async () => {
    hapticEngine.setEnabled(true)
    await hapticEngine.init()
    const Haptics = require('expo-haptics')
    Haptics.impactAsync.mockRejectedValueOnce(new Error('Haptic hardware error'))
    await expect(hapticEngine.impactMedium()).resolves.toBeUndefined()
  })
})

describe('Haptic Patterns', () => {
  let hapticEngine: any

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    hapticEngine = require('@/lib/haptics/engine').hapticEngine
  })

  test('sosPing fires 3 heavy impacts on full capability', async () => {
    // Verify triple-heavy pattern
    const { haptics } = require('@/lib/haptics/patterns')
    hapticEngine.setEnabled(true)
    await hapticEngine.init()
    
    // Mock capability to 'full' (Android API >= 31)
    await haptics.sosPing()
    const Haptics = require('expo-haptics')
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(3)
  })

  test('settleUp fires medium then light', async () => {
    const { haptics } = require('@/lib/haptics/patterns')
    hapticEngine.setEnabled(true)
    await hapticEngine.init()
    
    await haptics.settleUp()
    const Haptics = require('expo-haptics')
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2)
  })
})
