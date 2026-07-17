// src/components/auth/AuthProgress.tsx
// The flow-stitch (Blueprint §4.1): one running stitch that grows across the
// auth flow — a new segment sews on each step, so sign-up feels like a single
// continuous thread from "why" to "you're in", not four disconnected forms.
//
// A dim base stitch spans the full width; a live (madder) stitch is revealed
// left-to-right up to step/total, animating from the previous step's fraction
// so only the newly-earned segment appears to sew. Reduce Motion: snap to the
// final fraction, no growth.

import { useEffect, useRef, useState } from 'react'
import { Animated, View, StyleSheet, type LayoutChangeEvent } from 'react-native'
import { Stitch } from '@components/ui/Stitch'
import { useTheme } from '@theme'
import { useReduceMotion } from '@hooks/useReduceMotion'

interface AuthProgressProps {
  /** 1-based position in the flow. */
  step: number
  /** Total steps in the flow. */
  total: number
  /** When true, the newly-earned segment unsews back to the previous step —
   *  the OTP-error signature (§4.1). Clears (re-sews) when set back to false. */
  error?: boolean
}

export function AuthProgress({ step, total, error = false }: AuthProgressProps) {
  const { duration, ease } = useTheme()
  const reduceMotion = useReduceMotion()
  const [width, setWidth] = useState(0)

  const from = Math.max(0, Math.min(1, (step - 1) / total))
  const to = Math.max(0, Math.min(1, step / total))
  // On error the last segment retracts to the previous step (unsew).
  const target = error ? from : to

  const reveal = useRef(new Animated.Value(reduceMotion ? target : from)).current

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(target)
      return
    }
    const anim = Animated.timing(reveal, {
      toValue: target,
      // Unsew is sharper than sew — a recoil, not a stroll.
      duration: error ? duration.fast : duration.slow,
      easing: ease.out,
      useNativeDriver: false, // animating layout width
    })
    anim.start()
    return () => anim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduceMotion])

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  // The live stitch is laid out at full width so its dashes stay fixed; the
  // Animated wrapper's width (overflow hidden) reveals it left-to-right.
  const revealWidth = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width || 0],
  })

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
      accessibilityLabel={`Step ${step} of ${total}`}
    >
      {/* Dim base — the whole thread, not yet earned */}
      <Stitch tone="dim" length="100%" />

      {/* Live fill — sewn up to step/total */}
      {width > 0 && (
        <Animated.View style={[styles.fill, { width: revealWidth }]} pointerEvents="none">
          <Stitch tone="live" length={width} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 2,
    width: '100%',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
})
