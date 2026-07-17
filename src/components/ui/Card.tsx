// src/components/ui/Card.tsx
// Demoted per Law 1 — content sits ON the fabric; cards are exceptions.
// Blueprint §3.2: exactly three sanctioned intents:
//   'sheet-block'   — grouped block inside a Sheet (radius.soft)
//   'photo'         — memories / photo surfaces (radius.sheet)
//   'money-moment'  — settle-up confirmation, trip wrap (radius.sheet)
// No border, no shadow, no glow. Any other usage gets converted to <Row>
// or plain layout in review. `elevated`/`accentGlow` are dead props kept
// only so legacy call sites compile until the Phase 2/3 screen sweep.

import React, { useRef, useCallback } from 'react'
import {
  Animated,
  Pressable,
  View,
  StyleSheet,
  type ViewStyle,
  type PressableProps,
} from 'react-native'
import { useTheme } from '@theme'

export type CardIntent = 'sheet-block' | 'photo' | 'money-moment'

interface CardProps {
  children: React.ReactNode
  /** Sanctioned usage (§3.2). Legacy call sites without intent render as sheet-block. */
  intent?: CardIntent
  onPress?: PressableProps['onPress']
  onLongPress?: PressableProps['onLongPress']
  /** @deprecated flat by design — ignored */
  elevated?: boolean
  /** @deprecated glow is banned (§1.3) — ignored */
  accentGlow?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
  accessibilityLabel?: string
}

export function Card({
  children,
  intent = 'sheet-block',
  onPress,
  onLongPress,
  style,
  contentStyle,
  accessibilityLabel,
}: CardProps) {
  const { colors, spacing, radius, spring } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current
  const isPressable = Boolean(onPress || onLongPress)

  const handlePressIn = useCallback(() => {
    if (!isPressable) return
    Animated.spring(scaleAnim, { toValue: 0.97, ...spring.snappy }).start()
  }, [isPressable, scaleAnim, spring])

  const handlePressOut = useCallback(() => {
    if (!isPressable) return
    Animated.spring(scaleAnim, { toValue: 1, ...spring.gentle }).start()
  }, [isPressable, scaleAnim, spring])

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: intent === 'sheet-block' ? radius.soft : radius.sheet,
          padding: intent === 'photo' ? 0 : spacing.lg,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  )

  if (!isPressable) {
    return <View style={style}>{inner}</View>
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
})
