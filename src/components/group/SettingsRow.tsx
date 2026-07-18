// src/components/group/SettingsRow.tsx
import React from 'react'
import { Text, Pressable, View, StyleSheet, Switch, Platform } from 'react-native'
import { CaretRight } from 'phosphor-react-native'
import { useTheme } from '@theme'

interface SettingsRowProps {
  label:               string
  value?:              string | boolean
  onPress?:            () => void
  onToggle?:           (val: boolean) => void
  description?:        string
  danger?:             boolean
  disabled?:           boolean
  leftIcon?:           React.ReactNode
  rightMeta?:          React.ReactNode
  accessibilityLabel?: string
}

export function SettingsRow({
  label,
  value,
  onPress,
  onToggle,
  description,
  danger,
  disabled,
  leftIcon,
  rightMeta,
  accessibilityLabel,
}: SettingsRowProps) {
  const { colors, text, spacing, radius } = useTheme()

  const textColor = danger ? colors.negative : colors.textPrimary

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
          opacity:         disabled ? 0.4 : (pressed && onPress) ? 0.7 : 1,
        },
      ]}
      accessibilityRole={onToggle ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={onToggle ? { checked: typeof value === 'boolean' ? value : false } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={[styles.left, { flex: 1, marginRight: spacing.md }]}>
        {leftIcon && <View style={[styles.iconWrapper, { marginRight: spacing.sm }]}>{leftIcon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={[text.body.md, { color: textColor }]}>{label}</Text>
          {description ? (
            <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {onToggle ? (
          <Switch
            value={typeof value === 'boolean' ? value : false}
            onValueChange={onToggle}
            disabled={disabled}
            thumbColor={Platform.OS === 'android' ? (value ? colors.accentPrimary : colors.textMuted) : undefined}
            trackColor={{ false: colors.hairline, true: colors.accentPrimary + '50' }}
          />
        ) : (
          <>
            {value && typeof value === 'string' && (
              <Text style={[text.body.sm, { color: colors.textSecondary, marginRight: spacing.xs }]}>
                {value}
              </Text>
            )}
            {rightMeta != null && (
              typeof rightMeta === 'string' || typeof rightMeta === 'number' ? (
                <Text style={[text.label.sm, { color: colors.textMuted, marginRight: spacing.xs }]}>
                  {rightMeta}
                </Text>
              ) : (
                <View style={{ marginRight: spacing.xs }}>{rightMeta}</View>
              )
            )}
            {onPress && !disabled && (
              <CaretRight size={16} color={colors.textMuted} />
            )}
          </>
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
