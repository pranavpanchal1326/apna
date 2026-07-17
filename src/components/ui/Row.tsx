// src/components/ui/Row.tsx
// The standard content unit — Blueprint §3.0.2. Replaces default Cards (Law 1:
// content sits ON the fabric, not in boxes). 64pt standard, 56pt dense.
// Transparent on fabric; press = unified scale spring (§2.7.2 rule 4) +
// bgTertiary flash. No borders — separation is whitespace; optional hairline
// only inside grouped clusters.

import React, { useCallback, useRef } from 'react'
import {
  Animated,
  Pressable,
  Text,
  View,
  StyleSheet,
  type ViewStyle,
  type PressableProps,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'

interface RowProps extends Omit<PressableProps, 'style'> {
  /** Icon tile / avatar slot. */
  leading?: React.ReactNode
  title: string
  subtitle?: string
  /** Amount / chevron / control slot. */
  trailing?: React.ReactNode
  /** 56pt dense variant (settings). Default standard 64pt. */
  dense?: boolean
  /** Custom title/subtitle nodes when strings don't cut it. */
  titleNode?: React.ReactNode
  subtitleNode?: React.ReactNode
  /** Dim past/earlier rows to 60% (§4.2.1). */
  muted?: boolean
  style?: ViewStyle
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  dense = false,
  titleNode,
  subtitleNode,
  muted = false,
  style,
  onPress,
  ...rest
}: RowProps) {
  const { colors, spacing, layout, text, spring, radius } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const flash = useRef(new Animated.Value(0)).current
  const pressable = !!onPress

  const pressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, ...spring.snappy }).start()
    Animated.timing(flash, { toValue: 1, duration: 80, useNativeDriver: true }).start()
  }, [scale, flash, spring])

  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...spring.gentle }).start()
    Animated.timing(flash, { toValue: 0, duration: 200, useNativeDriver: true }).start()
  }, [scale, flash, spring])

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress?.(e)
    },
    [onPress]
  )

  const content = (
    <Animated.View
      style={[
        styles.row,
        {
          minHeight: dense ? layout.rowHeightDense : layout.rowHeight,
          transform: [{ scale }],
          opacity: muted ? 0.6 : 1,
        },
        style,
      ]}
    >
      {/* bgTertiary press flash */}
      {pressable && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill as object,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.soft,
              opacity: flash,
            },
          ]}
        />
      )}
      {leading && <View style={{ marginRight: spacing.md }}>{leading}</View>}
      <View style={styles.textBlock}>
        {titleNode ?? (
          <Text style={[text.body.lg, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {(subtitle || subtitleNode) && (
          subtitleNode ?? (
            <Text
              style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )
        )}
      </View>
      {trailing && <View style={{ marginLeft: spacing.md }}>{trailing}</View>}
    </Animated.View>
  )

  if (!pressable) return content

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      {...rest}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
})
