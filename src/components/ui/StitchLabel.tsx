// src/components/ui/StitchLabel.tsx
// Section header pattern — Blueprint §3.0.3.
// 16pt stitch + 8pt gap + labelSm ALL-CAPS text in textMuted.
// e.g. `— — —  TODAY`, `— — —  DAY 2 · JAIPUR`.
// Replaces every bare section-title <Text>. Max one caps label per section (§2.2.3).

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Stitch } from './Stitch'

interface StitchLabelProps {
  label: string
  /** 'dim' for past sections (e.g. EARLIER). Default 'dim' — labels are quiet. */
  tone?: 'live' | 'dim'
  /** Top/bottom margin. Defaults to section rhythm. */
  spacingTop?: number
  spacingBottom?: number
}

export function StitchLabel({
  label,
  tone = 'dim',
  spacingTop,
  spacingBottom,
}: StitchLabelProps) {
  const { colors, spacing, text } = useTheme()

  return (
    <View
      style={[
        styles.row,
        {
          marginTop: spacingTop ?? spacing.xl,
          marginBottom: spacingBottom ?? spacing.md,
        },
      ]}
      accessibilityRole="header"
    >
      <Stitch length={16} tone={tone} />
      <Text
        style={[
          text.label.sm,
          { color: colors.textMuted, marginLeft: spacing.sm },
        ]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
