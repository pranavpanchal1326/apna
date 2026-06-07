// src/components/ui/EmptyState.tsx
// Every empty list/state in the app uses this. No "No items." raw text ever.

import React from 'react'
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode           // Lucide icon or emoji node
  title: string
  description: string
  ctaLabel?: string
  onCta?: () => void
  style?: ViewStyle
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  style,
}: EmptyStateProps) {
  const { colors, spacing, text } = useTheme()

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={[styles.iconWrapper, { marginBottom: spacing.lg }]}>
          {icon}
        </View>
      )}

      <Text
        style={[
          text.heading.sm,
          {
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: spacing.sm,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          text.body.sm,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: 280,
            marginBottom: spacing.xl,
          },
        ]}
      >
        {description}
      </Text>

      {ctaLabel && onCta && (
        <Button
          label={ctaLabel}
          onPress={onCta}
          variant="primary"
          size="md"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
