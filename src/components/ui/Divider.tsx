// src/components/ui/Divider.tsx
// Kora & Ink Divider — Blueprint §3.7. Semantic breaks wrap <Stitch tone="dim">;
// a plain hairline variant is kept for inside grouped clusters only.
// Default spacing 16pt above/below. Prefer whitespace first, then this.

import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import { Stitch } from './Stitch'

interface DividerProps {
  /** 'thread' = semantic stitch break | 'line' = hairline inside a cluster. */
  type?: 'line' | 'thread'
  label?: string
  vertical?: boolean
  style?: ViewStyle
}

export function Divider({
  type = 'thread',
  label,
  vertical = false,
  style,
}: DividerProps) {
  const { colors, spacing, text } = useTheme()

  if (vertical) {
    if (type === 'thread') {
      return (
        <View style={[styles.vertical, style]}>
          <Stitch direction="vertical" tone="dim" />
        </View>
      )
    }
    return (
      <View style={[styles.vertical, { backgroundColor: colors.hairline, width: 1 }, style]} />
    )
  }

  if (label) {
    return (
      <View style={[styles.labelRow, style]}>
        <View style={styles.flexLine}>
          {type === 'thread'
            ? <Stitch tone="dim" />
            : <View style={[styles.line, { backgroundColor: colors.hairline }]} />}
        </View>
        <Text
          style={[
            text.label.sm,
            { color: colors.textMuted, marginHorizontal: spacing.md },
          ]}
        >
          {label.toUpperCase()}
        </Text>
        <View style={styles.flexLine}>
          {type === 'thread'
            ? <Stitch tone="dim" />
            : <View style={[styles.line, { backgroundColor: colors.hairline }]} />}
        </View>
      </View>
    )
  }

  if (type === 'thread') {
    return (
      <View style={style}>
        <Stitch tone="dim" />
      </View>
    )
  }

  return <View style={[styles.line, { backgroundColor: colors.hairline }, style]} />
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    width: '100%',
  },
  flexLine: {
    flex: 1,
  },
  vertical: {
    alignSelf: 'stretch',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
