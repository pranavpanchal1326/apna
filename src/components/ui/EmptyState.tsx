// src/components/ui/EmptyState.tsx
// Kora & Ink EmptyState — Blueprint §3.8 / §2.9. Thread-drawing illustration
// (sewn-in on mount) + headingSm + bodySm (max 34ch) + one Button. Positioned
// at 38% of screen height, not dead center — optically higher reads as
// intentional. Per-screen art and copy come from Part 4 / Appendix C.

import React from 'react'
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import { Button } from './Button'

interface EmptyStateProps {
  /** Thread-drawing illustration node (SVG, sewn in) or Phosphor icon. */
  illustration?: React.ReactNode
  /** @deprecated use `illustration` */
  icon?: React.ReactNode
  title: string
  description: string
  ctaLabel?: string
  onCta?: () => void
  style?: ViewStyle
}

export function EmptyState({
  illustration,
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  style,
}: EmptyStateProps) {
  const { colors, spacing, text } = useTheme()
  const art = illustration ?? icon

  return (
    <View style={[styles.container, style]}>
      {/* Optical position: 38% from top, not dead center (§3.8) */}
      <View style={styles.spacerTop} />
      {art && (
        <View style={[styles.iconWrapper, { marginBottom: spacing.lg }]}>
          {art}
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
      <View style={styles.spacerBottom} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // 38% / 62% split lands the content optically higher than dead center
  spacerTop: {
    flex: 0.38,
  },
  spacerBottom: {
    flex: 0.62,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
