// src/components/group/DangerZoneCard.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface DangerZoneCardProps {
  children: React.ReactNode
}

export function DangerZoneCard({ children }: DangerZoneCardProps) {
  const { colors, spacing, radius, text, shadows } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderColor:     `${colors.accentDanger}44`,
          borderWidth:     1,
          borderRadius:    radius.lg,
          padding:         spacing.lg,
          marginTop:       spacing.xl,
          ...shadows.card,
        },
      ]}
    >
      <Text style={[text.label.md, { color: colors.accentDanger, marginBottom: spacing.md, fontWeight: '700' }]}>
        DANGER ZONE
      </Text>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card:    { overflow: 'hidden' },
  content: { gap: 12 },
})
