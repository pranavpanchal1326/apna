// src/hooks/useReduceMotion.ts
// Single source of truth for the OS "Reduce Motion" setting (§2.7.2 rule 6).
// Every animated surface must honour it: motion becomes an instant snap to the
// final state, never a crossfade-to-nothing. Reads the initial value and stays
// subscribed so a mid-session toggle is respected.

import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  return reduceMotion
}
