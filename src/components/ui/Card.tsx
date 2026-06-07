// src/components/ui/Card.tsx
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

interface CardProps {
  children: React.ReactNode
  onPress?: PressableProps['onPress']
  onLongPress?: PressableProps['onLongPress']
  elevated?: boolean       // uses elevated shadow vs. card shadow
  accentGlow?: boolean     // teal glow — for positive balance cards only
  style?: ViewStyle
  contentStyle?: ViewStyle
  accessibilityLabel?: string
}

export function Card({
  children,
  onPress,
  onLongPress,
  elevated = false,
  accentGlow = false,
  style,
  contentStyle,
  accessibilityLabel,
}: CardProps) {
  const { colors, spacing, radius, shadows, spring } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current
  const isPressable = Boolean(onPress || onLongPress)

  const handlePressIn = useCallback(() => {
    if (!isPressable) return
    Animated.spring(scaleAnim, { toValue: 0.98, ...spring.snappy }).start()
  }, [isPressable, scaleAnim, spring])

  const handlePressOut = useCallback(() => {
    if (!isPressable) return
    Animated.spring(scaleAnim, { toValue: 1, ...spring.gentle }).start()
  }, [isPressable, scaleAnim, spring])

  const shadowStyle = accentGlow
    ? shadows.accentGlow
    : elevated
    ? shadows.elevated
    : shadows.card

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: accentGlow ? colors.borderAccent : colors.border,
          borderWidth: 1,
          padding: spacing.md,
        },
        shadowStyle,
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
