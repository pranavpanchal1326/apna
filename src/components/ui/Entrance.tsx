// src/components/ui/Entrance.tsx
// Entrance choreography (Blueprint §2.7.2 rule 1): a screen assembles itself —
// the focal element lands first, supporting rows rise in a stagger behind it,
// the FAB last. Never everything-at-once, never a plain fade.
//
// Each Entrance fades + rises its child from `distance`px below to rest. Order
// is driven by `index` × `stagger`. Honours Reduce Motion (§2.7.2 rule 6):
// the child is placed at its final state instantly, no motion.

import { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import { useReduceMotion } from '@hooks/useReduceMotion'

export interface EntranceProps {
  children: React.ReactNode
  /** Stagger position (0-based). Later index means later start. */
  index?: number
  /** ms between successive items. Default 42 (§2.7.1 stagger cadence). */
  stagger?: number
  /** Extra base delay before the whole sequence, ms. */
  delay?: number
  /** How far below its resting spot the child starts, px. Default 10. */
  distance?: number
  style?: ViewStyle | ViewStyle[]
}

export function Entrance({
  children,
  index = 0,
  stagger = 42,
  delay = 0,
  distance = 10,
  style,
}: EntranceProps) {
  const { duration, ease } = useTheme()
  const reduceMotion = useReduceMotion()
  // Start hidden only if we intend to animate; otherwise mount at rest so a
  // reduce-motion user (or a re-render) never sees a flash.
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1)
      return
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: duration.standard,
      delay: delay + index * stagger,
      easing: ease.out,
      useNativeDriver: true,
    })
    anim.start()
    return () => anim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion])

  const animatedStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  }

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
}
