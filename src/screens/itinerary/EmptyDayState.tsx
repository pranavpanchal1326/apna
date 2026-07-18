// src/screens/itinerary/EmptyDayState.tsx
// Empty state shown when a day has no items.
// Animated floating backpack emoji + warm CTA text + add button.
// Float animation: gentle vertical oscillation (Animated.loop).

import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Backpack } from 'phosphor-react-native'
import { useTheme } from '../../theme'
import { Button } from '../../components'

const AnimatedView = Animated.createAnimatedComponent(View)

interface EmptyDayStateProps {
  dayNumber: number
  onAdd:     () => void
  /** Optional — shown only when the whole-trip AI draft is available. */
  onAiDraft?: () => void
  isAiDrafting?: boolean
}

export function EmptyDayState({ dayNumber, onAdd, onAiDraft, isAiDrafting = false }: EmptyDayStateProps) {
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
      {/* Floating brand glyph */}
      <AnimatedView
        style={[
          styles.emoji,
          { transform: [{ translateY: floatAnim }] },
        ]}
        accessibilityElementsHidden
      >
        <Backpack size={56} color={colors.textSecondary} />
      </AnimatedView>

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

      {onAiDraft && (
        <Animated.View style={{ marginTop: spacing.md, opacity: fadeAnim }}>
          <Button
            variant="secondary"
            label={isAiDrafting ? 'Drafting your trip…' : 'Draft my trip with AI'}
            onPress={onAiDraft}
            disabled={isAiDrafting}
            loading={isAiDrafting}
          />
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
