// src/screens/itinerary/EmptyDayState.tsx
// Empty state shown when a day has no items.
// Animated floating backpack emoji + warm CTA text + add button.
// Float animation: gentle vertical oscillation (Animated.loop).

import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../theme'
import { Button } from '../../components'

interface EmptyDayStateProps {
  dayNumber: number
  onAdd:     () => void
}

export function EmptyDayState({ dayNumber, onAdd }: EmptyDayStateProps) {
  const { colors, text, spacing } = useTheme()
  const floatAnim = useRef(new Animated.Value(0)).current
  const fadeAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in on mount
    Animated.timing(fadeAnim, {
      toValue:         1,
      duration:        300,
      useNativeDriver: true,
    }).start()

    // Float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue:         -8,
          duration:        1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue:         0,
          duration:        1800,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [fadeAnim, floatAnim])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing['2xl'],
          paddingTop:        spacing['3xl'],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Floating emoji */}
      <Animated.Text
        style={[
          styles.emoji,
          { transform: [{ translateY: floatAnim }] },
        ]}
        accessibilityElementsHidden
      >
        🎒
      </Animated.Text>

      <Text
        style={[
          text.heading.md,
          {
            color:     colors.textPrimary,
            textAlign: 'center',
            marginTop: spacing.xl,
          },
        ]}
      >
        Day {dayNumber} is wide open
      </Text>

      <Text
        style={[
          text.body.md,
          {
            color:     colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing['2xl'],
          },
        ]}
      >
        Add your first stop — a café, a fort, a random street market.
        The plan shapes itself.
      </Text>

      <Button
        variant="primary"
        label="Add first stop"
        onPress={onAdd}
        leftIcon="plus"
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 64,
  },
})
