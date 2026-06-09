// src/screens/itinerary/ThreadLine.tsx
// The Dhaga thread — a vertical teal line connecting all itinerary items.
// Renders as an absolute View behind the item list.
// Height is calculated from the list content height passed by DayPlannerView.
//
// DESIGN RULES:
//   - Width: 2dp — precise, not chunky
//   - Color: colors.threadLine (rgba teal, 25% opacity dark / 30% light)
//   - Left offset: 28dp from screen edge (aligns with center of 32dp icon circles)
//   - Top: starts at first item's icon center
//   - Bottom: ends at last item's icon center
//   - Animated opacity: fades in when items load (Spring.gentle)

import { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { useTheme } from '../../theme'

interface ThreadLineProps {
  height:  number    // Total height of the item list content area
  visible: boolean   // Animate in/out when items appear/disappear
}

export function ThreadLine({ height, visible }: ThreadLineProps) {
  const { colors, spacing, spring } = useTheme()
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(opacity, {
      toValue:  visible ? 1 : 0,
      ...spring.gentle,
      useNativeDriver: true,
    }).start()
  }, [visible, spring.gentle, opacity])

  if (height <= 0) return null

  return (
    <Animated.View
      style={[
        styles.thread,
        {
          height,
          backgroundColor: colors.threadLine,
          left: spacing.xl + 15,   // 24 + 15 = 39dp — center of 32dp icon at left:23dp
          opacity,
        },
      ]}
      pointerEvents="none"   // Never intercepts touches
    />
  )
}

const styles = StyleSheet.create({
  thread: {
    position:  'absolute',
    top:       24,            // Offset from top of first item to icon center
    width:     2,
    borderRadius: 1,
  },
})
