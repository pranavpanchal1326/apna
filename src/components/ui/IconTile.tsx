// src/components/ui/IconTile.tsx
// Blueprint §3.0.5 — 20pt icon centered in a 40pt radius.soft square with a
// category tint or bgTertiary. The leading element of most rows.
// Icons inherit text color of their context (§2.5.2); never accent-colored
// except inside the three madder-budget slots.

import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'

interface IconTileProps {
  /** A 20pt Phosphor icon (or custom glyph). */
  children: React.ReactNode
  /** Category tint rgba (colors.category[k].tint) or omit for bgTertiary. */
  tint?: string
  /** Tile edge. Default 40. Group-emoji tiles use 48 (§3.14). */
  size?: number
  style?: ViewStyle
}

export function IconTile({ children, tint, size = 40, style }: IconTileProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius.soft,
          backgroundColor: tint ?? colors.bgTertiary,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
