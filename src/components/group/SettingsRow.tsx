// src/components/group/SettingsRow.tsx
import React from 'react'
import { Text, Pressable, View, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface SettingsRowProps {
  label:               string
  value?:              string
  onPress?:            () => void
  danger?:             boolean
  disabled?:           boolean
  leftIcon?:           React.ReactNode
  rightMeta?:          string
  accessibilityLabel?: string
}

export function SettingsRow({
  label,
  value,
  onPress,
  danger,
  disabled,
  leftIcon,
  rightMeta,
  accessibilityLabel,
}: SettingsRowProps) {
  const { colors, text, spacing, radius } = useTheme()

  const textColor = danger ? colors.accentDanger : colors.textPrimary

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight:       52,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.md,
          opacity:         disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.left}>
        {leftIcon && <View style={[styles.iconWrapper, { marginRight: spacing.sm }]}>{leftIcon}</View>}
        <Text style={[text.body.md, { color: textColor }]}>{label}</Text>
      </View>

      <View style={styles.right}>
        {value && (
          <Text style={[text.body.sm, { color: colors.textSecondary, marginRight: spacing.xs }]}>
            {value}
          </Text>
        )}
        {rightMeta && (
          <Text style={[text.label.sm, { color: colors.textMuted, marginRight: spacing.xs }]}>
            {rightMeta}
          </Text>
        )}
        {onPress && !disabled && (
          <Text style={[text.heading.sm, { color: colors.textMuted, fontSize: 16 }]}>›</Text>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left:        { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { alignItems: 'center', justifyContent: 'center' },
  right:       { flexDirection: 'row', alignItems: 'center' },
})
