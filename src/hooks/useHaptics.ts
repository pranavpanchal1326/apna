// src/hooks/useHaptics.ts
import { useState } from 'react'
import { hapticEngine, type HapticCapabilityLevel } from '../lib/haptics'

export interface UseHapticsResult {
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
  capabilityLevel: HapticCapabilityLevel
  hasHaptics: boolean   // true if capabilityLevel !== 'none'
}

export function useHaptics(): UseHapticsResult {
  const [, forceUpdate] = useState(0)
  const config = hapticEngine.getConfig()

  const setEnabled = (enabled: boolean) => {
    hapticEngine.setEnabled(enabled)
    forceUpdate((prev) => prev + 1)
  }

  return {
    isEnabled: config.enabled,
    setEnabled,
    capabilityLevel: config.capabilityLevel,
    hasHaptics: config.capabilityLevel !== 'none',
  }
}
