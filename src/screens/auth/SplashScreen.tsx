// src/screens/auth/SplashScreen.tsx
// Kora & Ink splash — Blueprint §7.4/§7.5. THE SEW: the dhaga "a" sews itself
// (bowl → thread pull → knot bounce, 1150ms), then the "pna" wordmark joins and
// the screen hands off. This is the brand's single most important animation —
// the first thing seen on every cold launch, and while auth initializes.
//
// Reduce Motion (§7.4): DhagaLogo renders its static mark; we skip the fades
// and hand off quickly rather than crossfade-to-nothing.

import { useEffect, useRef, useCallback } from 'react'
import { Animated, View, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { DhagaLogo } from '@components'
import { useReduceMotion } from '@hooks/useReduceMotion'

interface SplashScreenProps {
  onComplete: () => void   // Called after the mark sews and the screen hands off
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { colors, text } = useTheme()
  const reduceMotion = useReduceMotion()

  const wordmarkOpacity = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(1)).current
  const done = useRef(false)

  // After the knot ties, "pna" joins the stitched "a", the mark holds, then the
  // screen fades and hands off. Guarded so it can only run once.
  const handoff = useCallback(() => {
    if (done.current) return
    done.current = true

    if (reduceMotion) {
      wordmarkOpacity.setValue(1)
      onComplete()
      return
    }

    Animated.sequence([
      Animated.timing(wordmarkOpacity, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => onComplete())
  }, [reduceMotion, wordmarkOpacity, screenOpacity, onComplete])

  // Safety net: if onSewComplete never fires (edge cases), hand off anyway.
  useEffect(() => {
    const t = setTimeout(handoff, 2600)
    return () => clearTimeout(t)
  }, [handoff])

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.bgPrimary, opacity: screenOpacity }]}
    >
      <View style={styles.lockup}>
        {/* The stitched "a" — sews itself on mount (THE SEW) */}
        <DhagaLogo size={96} sew onSewComplete={handoff} />

        {/* "pna" completes the wordmark once the knot lands (§7.3 lockup) */}
        <Animated.Text
          style={[
            text.display.md,
            { color: colors.textPrimary, opacity: wordmarkOpacity, marginLeft: -6 },
          ]}
        >
          pna
        </Animated.Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
