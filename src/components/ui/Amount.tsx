// src/components/ui/Amount.tsx
// The only way money renders — Blueprint §3.0.4 / §2.2.4.
// "In a money app, numbers are 60% of the emotional surface."
//
// Enforces: mono, tabular figures, ₹ at 0.8em in textSecondary (digits carry
// the weight, the symbol whispers). Positive amounts get a leading `+` in
// leaf; negative amounts are plain madder — NO minus sign (the color and
// context say it; a minus reads like an accusation). Zero renders in
// `settled` with a stitchDim strike-through — "sewn shut".

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View, StyleSheet, type TextStyle } from 'react-native'
import { useTheme } from '@theme'
import { useReduceMotion } from '@hooks/useReduceMotion'
import { amountSemantics, formatAmountDigits } from '@lib/utils/amount'
import { Stitch } from './Stitch'

export type AmountSize = 'lg' | 'md' | 'sm'

interface AmountProps {
  /** Value in rupees. Sign carries direction when `signed`. */
  value: number
  size?: AmountSize
  /** Adds `+` in leaf for positive, madder for negative (no minus). */
  signed?: boolean
  /** Force the sewn-shut zero treatment even for nonzero (rare). */
  settled?: boolean
  /** Odometer roll on value change — 240ms Ease.out (§2.2.4). */
  animate?: boolean
  /** Override digit color (e.g. onAccent inside a primary Button). */
  color?: string
  style?: TextStyle
}

export function Amount({
  value,
  size = 'md',
  signed = false,
  settled = false,
  animate = false,
  color,
  style,
}: AmountProps) {
  const { colors, text, fontSize, duration } = useTheme()
  const [display, setDisplay] = useState(value)
  const reduceMotion = useReduceMotion()
  const animRef = useRef(new Animated.Value(value)).current

  // Odometer roll (count interpolation; digit-by-digit roll lands with the
  // money-moment choreography in Phase 3). §2.7.2 rule 6: Reduce Motion snaps.
  useEffect(() => {
    if (!animate || reduceMotion) {
      setDisplay(value)
      return
    }
    const listener = animRef.addListener(({ value: v }) => setDisplay(v))
    const anim = Animated.timing(animRef, {
      toValue: value,
      duration: duration.hero ?? 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    })
    anim.start(() => setDisplay(value))
    return () => {
      animRef.removeListener(listener)
      anim.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animate, reduceMotion])

  const monoStyle = text.mono[size]
  const rupeeSize = Math.round(fontSize[`mono${size.charAt(0).toUpperCase()}${size.slice(1)}` as 'monoLg' | 'monoMd' | 'monoSm'] * 0.8)

  // Semantic state (color, sign, sewn-shut strike) tracks the TARGET value —
  // not the animating display — so a roll passing through zero doesn't flash
  // the settled strike-through or flip the sign mid-animation. See @lib/utils/amount.
  const { isZero, showPlus, showStrike, role } = amountSemantics(value, { signed, settled })

  const digitColor = color ?? (
    role === 'zero' ? colors.settled
    : role === 'positive' ? colors.positive
    : role === 'negative' ? colors.negative
    : colors.textPrimary
  )

  return (
    <View style={styles.wrap}>
      <Text
        style={[monoStyle, { color: digitColor, fontVariant: ['tabular-nums'] }, style]}
        numberOfLines={1}
        accessibilityLabel={
          isZero ? 'zero rupees, settled'
          : `${showPlus ? 'plus ' : ''}${formatAmountDigits(value)} rupees`
        }
      >
        {showPlus ? '+' : ''}
        <Text style={{ fontSize: rupeeSize, color: color ?? colors.textSecondary }}>₹</Text>
        {settled ? '0' : formatAmountDigits(display)}
      </Text>
      {/* Sewn shut — stitchDim strike-through on ₹0 (§2.2.4) */}
      {showStrike && (
        <View style={styles.strike} pointerEvents="none">
          <Stitch tone="dim" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  strike: {
    ...StyleSheet.absoluteFill as object,
    justifyContent: 'center',
  },
})
