// src/components/ui/Divider.tsx
// Dhaga visual divider — uses threadLine color for timeline connectors,
// border color for standard section separators.

import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'

interface DividerProps {
  type?: 'line' | 'thread'   // line = section separator | thread = timeline connector
  label?: string              // Optional center label: "or", "Day 1", etc.
  vertical?: boolean
  style?: ViewStyle
}

export function Divider({
  type = 'line',
  label,
  vertical = false,
  style,
}: DividerProps) {
  const { colors, spacing, text } = useTheme()
  const color = type === 'thread' ? colors.threadLine : colors.border

  if (vertical) {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: color, width: 1 },
          style,
        ]}
      />
    )
  }

  if (label) {
    return (
      <View style={[styles.labelRow, style]}>
        <View style={[styles.line, { backgroundColor: color, flex: 1 }]} />
        <Text
          style={[
            text.label.sm,
            {
              color: colors.textMuted,
              marginHorizontal: spacing.md,
            },
          ]}
        >
          {label}
        </Text>
        <View style={[styles.line, { backgroundColor: color, flex: 1 }]} />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.line,
        { backgroundColor: color },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    width: '100%',
  },
  vertical: {
    alignSelf: 'stretch',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
