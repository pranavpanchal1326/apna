// src/components/ui/FAB.tsx
import { useRef, useCallback, useState } from 'react'
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

// ── Simple FAB ───────────────────────────────────────────────────
interface FABProps {
  icon: React.ReactNode
  onPress: () => void
  accessibilityLabel: string
  style?: ViewStyle
}

export function FAB({ icon, onPress, accessibilityLabel, style }: FABProps) {
  const { colors, shadows } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.93, tension: 100, friction: 10, useNativeDriver: true }).start()
  }, [scaleAnim])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start()
  }, [scaleAnim])

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }, [onPress])

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.fab,
          {
            backgroundColor: colors.accentPrimary,
            ...shadows.accentGlow,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {icon}
      </Pressable>
    </Animated.View>
  )
}

// ── Radial FAB — expands to 3 actions (Home screen) ──────────────
interface RadialAction {
  id: string
  icon: React.ReactNode
  label: string
  onPress: () => void
  color?: string
}

interface RadialFABProps {
  actions: [RadialAction, RadialAction, RadialAction]  // Exactly 3
  style?: ViewStyle
}

export function RadialFAB({ actions, style }: RadialFABProps) {
  const { colors, spacing, shadows, text } = useTheme()
  const [open, setOpen] = useState(false)
  const rotation = useRef(new Animated.Value(0)).current
  const actionAnims = actions.map(() => useRef(new Animated.Value(0)).current)
  const backdropOpacity = useRef(new Animated.Value(0)).current

  const toggle = useCallback(() => {
    const toOpen = !open
    setOpen(toOpen)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    Animated.parallel([
      Animated.spring(rotation, {
        toValue: toOpen ? 1 : 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: toOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      ...actionAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: toOpen ? 1 : 0,
          tension: 70,
          friction: 8,
          delay: toOpen ? i * 40 : (2 - i) * 30,
          useNativeDriver: true,
        })
      ),
    ]).start()
  }, [open, rotation, backdropOpacity, actionAnims])

  // + icon rotates to × when open
  const rotateInterpolated = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  })

  // Actions arc upward in a radial fan
  const ACTION_OFFSETS = [
    { x: 0,  y: -80 },
    { x: -64, y: -56 },
    { x: 64,  y: -56 },
  ]

  return (
    <View style={[styles.radialWrapper, style]} pointerEvents="box-none">
      {/* Backdrop */}
      {open && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim, opacity: backdropOpacity },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable style={{ flex: 1 }} onPress={toggle} />
        </Animated.View>
      )}

      {/* Action buttons */}
      {actions.map((action, i) => (
        <Animated.View
          key={action.id}
          style={[
            styles.actionItem,
            {
              transform: [
                {
                  translateX: actionAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, ACTION_OFFSETS[i].x],
                  }),
                },
                {
                  translateY: actionAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, ACTION_OFFSETS[i].y],
                  }),
                },
                {
                  scale: actionAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ],
              opacity: actionAnims[i],
            },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable
            onPress={() => {
              toggle()
              action.onPress()
            }}
            style={[
              styles.actionButton,
              {
                backgroundColor: action.color ?? colors.bgTertiary,
                borderColor: colors.border,
                borderWidth: 1,
                ...shadows.elevated,
              },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.icon}
          </Pressable>
          <Text
            style={[
              text.label.sm,
              {
                color: colors.textSecondary,
                marginTop: spacing.xs,
                textAlign: 'center',
              },
            ]}
          >
            {action.label}
          </Text>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <Pressable
        onPress={toggle}
        style={[
          styles.fab,
          {
            backgroundColor: colors.accentPrimary,
            ...shadows.accentGlow,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close menu' : 'Open menu'}
        accessibilityState={{ expanded: open }}
      >
        <Animated.Text
          style={{
            color: colors.bgPrimary,
            fontSize: 28,
            fontFamily: 'Outfit-Regular',
            lineHeight: 32,
            transform: [{ rotate: rotateInterpolated }],
          }}
        >
          +
        </Animated.Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  fabContainer: {},
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
