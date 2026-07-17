// src/components/ui/FAB.tsx
// Kora & Ink FAB — Blueprint §3.3. A 56pt madder pill (not a circle) with the
// custom thread-add icon (28pt) plus an optional label that collapses to
// icon-only on scroll-down and re-expands on scroll-up. No glow (banned §1.3).
// Entrance: +160ms after screen content, scale 0.6→1 Spring.gentle.
// This is Law 3 slot 1 — a screen with a FAB must not also show a primary Button.

import React, { useEffect, useRef, useCallback, useState } from 'react'
import {
  Animated,
  Pressable,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { ThreadAdd, StitchArrow } from '../icons'

// ── FAB — madder pill, morphing label ────────────────────────────
interface FABProps {
  onPress: () => void
  accessibilityLabel: string
  /** Optional label; collapses to icon-only when `collapsed`. */
  label?: string
  /** Icon override. Defaults to thread-add. */
  icon?: React.ReactNode
  /** Drive from scroll direction to collapse the label (§3.3). */
  collapsed?: boolean
  style?: ViewStyle
}

export function FAB({
  onPress,
  accessibilityLabel,
  label,
  icon,
  collapsed = false,
  style,
}: FABProps) {
  const { colors, spacing, radius, text, spring } = useTheme()
  const scale = useRef(new Animated.Value(0.6)).current
  const press = useRef(new Animated.Value(1)).current

  // Entrance: scale 0.6 → 1, +160ms after content (§3.3 / §2.7.2 rule 1)
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(scale, { toValue: 1, ...spring.gentle }).start()
    }, 160)
    return () => clearTimeout(t)
  }, [scale, spring])

  const pressIn = useCallback(() => {
    Animated.spring(press, { toValue: 0.93, ...spring.snappy }).start()
  }, [press, spring])
  const pressOut = useCallback(() => {
    Animated.spring(press, { toValue: 1, ...spring.gentle }).start()
  }, [press, spring])
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }, [onPress])

  const showLabel = !!label && !collapsed

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: Animated.multiply(scale, press) }] }, style]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.pill,
          {
            backgroundColor: colors.accentPrimary,
            borderRadius: radius.full,
            paddingHorizontal: showLabel ? spacing.lg : 0,
            width: showLabel ? undefined : 56,
          },
        ]}
      >
        {icon ?? <ThreadAdd size={28} color={colors.onAccent} />}
        {showLabel && (
          <Text style={[text.label.lg, { color: colors.onAccent, marginLeft: spacing.sm }]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}

// ── Radial FAB — expands to a Sheet-style fan (Home / Group) ─────
// Restyled per §3.3: no glow, thread-add rotates toward stitch-arrow, all
// satellites are neutral bgTertiary tiles. (Screens will migrate this to the
// two-Row Sheet pattern in Phase 3; kept working here for the re-skin.)
interface RadialAction {
  id: string
  icon: React.ReactNode
  label: string
  onPress: () => void
  color?: string
}

interface RadialFABProps {
  actions: [RadialAction, RadialAction] | [RadialAction, RadialAction, RadialAction]
  style?: ViewStyle
}

export function RadialFAB({ actions, style }: RadialFABProps) {
  const { colors, spacing, radius, text } = useTheme()
  const [open, setOpen] = useState(false)
  const rotation = useRef(new Animated.Value(0)).current
  const actionAnims = useRef(actions.map(() => new Animated.Value(0))).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  const toggle = useCallback(() => {
    const toOpen = !open
    setOpen(toOpen)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    Animated.parallel([
      Animated.spring(rotation, { toValue: toOpen ? 1 : 0, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: toOpen ? 1 : 0, duration: 200, useNativeDriver: true }),
      ...actionAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: toOpen ? 1 : 0,
          tension: 70,
          friction: 8,
          delay: toOpen ? i * 40 : (actions.length - 1 - i) * 30,
          useNativeDriver: true,
        })
      ),
    ]).start()
  }, [open, rotation, backdropOpacity, actionAnims, actions.length])

  // thread-add rotates 45° toward a close affordance when open
  const rotateInterpolated = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  })

  const OFFSETS = [
    { x: 0, y: -80 },
    { x: -64, y: -56 },
    { x: 64, y: -56 },
  ]

  return (
    <View style={[styles.radialWrapper, style]} pointerEvents="box-none">
      {open && (
        <Animated.View
          style={[StyleSheet.absoluteFill as object, { backgroundColor: colors.scrim, opacity: backdropOpacity }]}
          pointerEvents="auto"
        >
          <Pressable style={styles.flex} onPress={toggle} />
        </Animated.View>
      )}

      {actions.map((action, i) => (
        <Animated.View
          key={action.id}
          style={[
            styles.actionItem,
            {
              transform: [
                { translateX: actionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, OFFSETS[i].x] }) },
                { translateY: actionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, OFFSETS[i].y] }) },
                { scale: actionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
              opacity: actionAnims[i],
            },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable
            onPress={() => { toggle(); action.onPress() }}
            style={[styles.actionButton, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.icon}
          </Pressable>
          <Text style={[text.label.sm, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
            {action.label}
          </Text>
        </Animated.View>
      ))}

      <Pressable
        onPress={toggle}
        style={[styles.fab, { backgroundColor: colors.accentPrimary, borderRadius: radius.full }]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close menu' : 'Open menu'}
        accessibilityState={{ expanded: open }}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolated }] }}>
          {open
            ? <StitchArrow size={28} color={colors.onAccent} />
            : <ThreadAdd size={28} color={colors.onAccent} />}
        </Animated.View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},
  flex: { flex: 1 },
  pill: {
    height: 56,
    minWidth: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  actionButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
