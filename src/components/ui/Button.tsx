// src/components/ui/Button.tsx
import React, { useRef, useCallback } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
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
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      ...spring.snappy,
    }).start()
  }, [scaleAnim, spring])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...spring.gentle,
    }).start()
  }, [scaleAnim, spring])

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (isDisabled) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress?.(e)
    },
    [isDisabled, onPress]
  )

  // ── Size tokens ────────────────────────────────────────────────
  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
    md: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md },
    lg: { height: 56, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  }

  const textSizeStyles = {
    sm: text.label.lg,
    md: text.body.md,
    lg: text.body.lg,
  }

  // ── Variant tokens ─────────────────────────────────────────────
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.accentPrimary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accentPrimary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.accentDanger,
    },
  }

  const textColorMap: Record<ButtonVariant, string> = {
    primary:   colors.bgPrimary,
    secondary: colors.accentPrimary,
    ghost:     colors.textSecondary,
    danger:    '#FFFFFF',
  }

  const disabledOverlay: ViewStyle = isDisabled
    ? { opacity: 0.4 }
    : {}

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
          <ActivityIndicator
            size="small"
            color={textColorMap[variant]}
          />
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
})
