// src/screens/auth/ValueFramingScreen.tsx
// Conversion-optimized introductory screen highlighting apna's group features (expenses, itineraries, location, memories).
// Implements A/B testing on copy variants and instruments funnel start in PostHog.

import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { useTheme } from '@theme'
import { Button, Screen } from '@components'
import { track } from '@lib/analytics'
import type { AuthStackParamList } from '@navigation/types'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ValueFraming'>

const HIGHLIGHTS = [
  { emoji: '💸', label: 'Share Expenses', description: 'Split bills, settle up, and track group spending easily.' },
  { emoji: '📅', label: 'Build Itineraries', description: 'Co-plan trip itineraries, events, and voting nodes.' },
  { emoji: '👻', label: 'Live Locations', description: 'Share locations for safety with built-in Ghost Mode.' },
  { emoji: '📸', label: 'Group Memories', description: 'Save high-resolution photos and react to squad moments.' },
]

export function ValueFramingScreen() {
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation = useNavigation<Nav>()

  // A/B copy variant state ('A' = Squad Hub, 'B' = Group Life)
  const [variant, setVariant] = useState<'A' | 'B'>('A')

  // Entry animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const itemsFadeAnims = useRef(HIGHLIGHTS.map(() => new Animated.Value(0))).current

  useEffect(() => {
    // 1. Randomize A/B variant
    const selectedVariant = Math.random() < 0.5 ? 'A' : 'B'
    setVariant(selectedVariant)

    // 2. Track onboarding started
    track('onboarding_started', {
      flow_variant: selectedVariant,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      step_index: 0,
    })

    // 3. Play entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Stagger highlight items fading in
    const staggerAnims = itemsFadeAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 300 + i * 150,
        useNativeDriver: true,
      })
    )
    Animated.parallel(staggerAnims).start()
  }, [])

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Track funnel step completion
    track('value_framing_completed', {
      flow_variant: variant,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      step_index: 0,
    })

    // Navigate to Auth screen
    navigation.navigate('PhoneInput')
  }

  const heroLine =
    variant === 'A'
      ? "apna — the home for your squad's adventures."
      : 'apna — simplify group plans, money, and memories.'

  const supportingLine =
    variant === 'A'
      ? 'Co-plan trip itineraries, split group expenses, react to memories, and track locations safely.'
      : 'Keep your trips, roomies, and hangouts synchronized. Everything in one beautiful thread.'

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Animated.View
        style={[
          styles.container,
          {
            paddingHorizontal: spacing['2xl'],
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Brand Label */}
        <View style={styles.brandContainer}>
          <Text style={[text.heading.sm, { color: colors.accentPrimary, fontWeight: '700', letterSpacing: 1 }]}>
            APNA
          </Text>
        </View>

        {/* Hero Title */}
        <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          {heroLine}
        </Text>

        {/* Hero Subtitle */}
        <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'], lineHeight: 22 }]}>
          {supportingLine}
        </Text>

        {/* Feature Staggered Highlights */}
        <View style={[styles.highlightsContainer, { gap: spacing.lg }]}>
          {HIGHLIGHTS.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.highlightRow,
                {
                  opacity: itemsFadeAnims[index],
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={[styles.emojiBadge, { backgroundColor: colors.bgTertiary, borderRadius: radius.md }]}>
                <Text style={styles.emojiText}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[text.label.md, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2, lineHeight: 18 }]}>
                  {item.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Footer CTA & Terms */}
        <View style={[styles.footer, { marginTop: spacing['2xl'] }]}>
          <Button
            label="Get Started"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleGetStarted}
            style={{ ...styles.cta, ...shadows.accentGlow }}
          />

          <Text style={[text.label.sm, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
            No spam. No ads. Just you and your group.
          </Text>
        </View>
      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  brandContainer: {
    marginBottom: 16,
  },
  highlightsContainer: {
    width: '100%',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  emojiBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiText: {
    fontSize: 22,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    height: 54,
  },
})
