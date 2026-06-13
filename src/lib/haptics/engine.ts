// src/lib/haptics/engine.ts
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { createMMKV } from 'react-native-mmkv'

export type HapticCapabilityLevel =
  | 'full'        // flagship — full haptic engine (Pixel 6+, Samsung S-series)
  | 'basic'       // mid-range — impact and notification only (Redmi, Realme, A-series)
  | 'none'        // no haptic support or user has disabled vibration

export interface HapticEngineConfig {
  enabled: boolean
  capabilityLevel: HapticCapabilityLevel
}

const hapticsStorage = createMMKV({ id: 'apna-haptics' })
const PREFERENCE_KEY = 'haptics_enabled'

let isInitialized = false
const config: HapticEngineConfig = {
  enabled: true,
  capabilityLevel: 'none',
}

// Keep a list of state listeners to notify useHaptics hook when preferences change
const listeners = new Set<() => void>()

export const hapticEngine = {
  async init(): Promise<void> {
    if (isInitialized) return
    
    try {
      const hapticsObj = Haptics as unknown as Record<string, unknown>
      const isAvailableAsync = hapticsObj.isAvailableAsync
      const isAvailable = typeof isAvailableAsync === 'function'
        ? await (isAvailableAsync as () => Promise<boolean>)()
        : true

      if (!isAvailable) {
        config.capabilityLevel = 'none'
      } else if (Platform.OS === 'android') {
        const version = Platform.Version
        if (typeof version === 'number') {
          if (version >= 31) {
            config.capabilityLevel = 'full'
          } else if (version >= 26) {
            config.capabilityLevel = 'basic'
          } else {
            config.capabilityLevel = 'none'
          }
        } else {
          config.capabilityLevel = 'basic'
        }
      } else {
        config.capabilityLevel = 'full'
      }

      const persisted = hapticsStorage.contains(PREFERENCE_KEY)
        ? hapticsStorage.getBoolean(PREFERENCE_KEY) ?? true
        : true
      
      config.enabled = persisted
      isInitialized = true
    } catch {
      config.capabilityLevel = 'none'
      config.enabled = false
    }
  },

  getConfig(): HapticEngineConfig {
    return { ...config }
  },

  setEnabled(enabled: boolean): void {
    config.enabled = enabled
    hapticsStorage.set(PREFERENCE_KEY, enabled)
    listeners.forEach((l) => l())
  },

  isEnabled(): boolean {
    return config.enabled && config.capabilityLevel !== 'none'
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  async impactLight(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      // Degrade silently
    }
  },

  async impactMedium(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {
      // Degrade silently
    }
  },

  async impactHeavy(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    } catch {
      // Degrade silently
    }
  },

  async notificationSuccess(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      if (config.capabilityLevel === 'basic') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {
      // Degrade silently
    }
  },

  async notificationWarning(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      if (config.capabilityLevel === 'basic') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    } catch {
      // Degrade silently
    }
  },

  async notificationError(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      if (config.capabilityLevel === 'basic') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } catch {
      // Degrade silently
    }
  },

  async selectionChanged(): Promise<void> {
    if (!this.isEnabled()) return
    try {
      await Haptics.selectionAsync()
    } catch {
      // Fallback silently to light impact
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {
        // Degrade silently
      }
    }
  },
}
