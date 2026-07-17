// src/components/ui/Button.tsx
// Kora & Ink Button — Blueprint §3.1. Behavior kept (spring press, haptics),
// skin replaced:
// - primary: madder fill, onAccent text, pill at md/lg. The ONLY madder-filled
//   control on any screen (Law 3 slot 1).
// - secondary: bgTertiary fill, textPrimary. No colored outline (template tell).
// - ghost: text-only, textSecondary → textPrimary on press.
// - danger: destructive confirms inside sheets only; madder fill, heavy haptic.
// - loading: label crossfades to three sewing dashes, not a spinner.

import React, { useEffect, useRef, useCallback } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  label: string
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

// Three sewing dashes — the loading state (§3.1). A mini stitch, not a spinner.
function SewingDashes({ color }: { color: string }) {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.25, duration: 220, useNativeDriver: true }),
          Animated.delay((2 - i) * 140),
        ])
      )
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [anims])

  return (
    <View style={styles.dashRow} accessibilityLabel="Loading">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[styles.dash, { backgroundColor: color, opacity: a }]}
        />
      ))}
    </View>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  style,
  textStyle,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors, spacing, radius, text, spring } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current
  const isDisabled = disabled || loading

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, ...spring.snappy }).start()
  }, [scaleAnim, spring])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, ...spring.gentle }).start()
  }, [scaleAnim, spring])

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (isDisabled) return
      if (variant === 'danger') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      onPress?.(e)
    },
    [isDisabled, onPress, variant]
  )

  // ── Size tokens (§3.1): sm 36 soft, md 48 pill, lg 56 pill ──────
  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.soft },
    md: { height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.full },
    lg: { height: 56, paddingHorizontal: spacing.xl, borderRadius: radius.full },
  }

  const textSizeStyles = {
    sm: text.label.lg,
    md: text.body.md,
    lg: text.body.lg,
  }

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary:   { backgroundColor: colors.accentPrimary },
    secondary: { backgroundColor: colors.bgTertiary },
    ghost:     { backgroundColor: 'transparent' },
    danger:    { backgroundColor: colors.accentPrimary },
  }

  const textColorMap: Record<ButtonVariant, string> = {
    primary:   colors.onAccent,
    secondary: colors.textPrimary,
    ghost:     colors.textSecondary,
    danger:    colors.onAccent,
  }

  const disabledOverlay: ViewStyle = isDisabled ? { opacity: 0.4 } : {}

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.base,
          sizeStyles[size],
          variantStyles[variant],
          disabledOverlay,
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <SewingDashes color={textColorMap[variant]} />
        ) : (
          <View style={styles.inner}>
            {leftIcon && <View style={{ marginRight: spacing.sm }}>{leftIcon}</View>}
            <Text
              style={[
                textSizeStyles[size],
                { color: textColorMap[variant] },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // WCAG touch target floor — never go below
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dash: {
    width: 6,
    height: 2,
    borderRadius: 1,
  },
})
