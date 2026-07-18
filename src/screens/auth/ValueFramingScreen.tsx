// src/screens/auth/ValueFramingScreen.tsx
// Kora & Ink value framing — Blueprint §4.1 (first flow screen). The "why"
// before the "who are you". Four capabilities as Rows on fabric with brand
// glyphs (no emoji chrome, no bordered cards), the flow-stitch at the top, and
// the entrance choreography assembling hero → rows → CTA.
// A/B copy variants + PostHog funnel instrumentation are preserved unchanged.

import { useState, useEffect, type ComponentType } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { useTheme } from '@theme'
import { Button, Screen, Row, IconTile, Entrance, Potli, Rasta, Taveez, Baithak } from '@components'
import { AuthProgress } from '@components/auth'
import { track } from '@lib/analytics'
import type { AuthStackParamList } from '@navigation/types'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ValueFraming'>

type GlyphProps = { size?: number; color?: string }
const HIGHLIGHTS: {
  Glyph: ComponentType<GlyphProps>
  label: string
  description: string
}[] = [
  { Glyph: Potli,   label: 'Share expenses',    description: 'Split bills, settle up, and track group spending easily.' },
  { Glyph: Rasta,   label: 'Build itineraries', description: 'Co-plan trip days, events, and voting nodes.' },
  { Glyph: Taveez,  label: 'Live locations',    description: 'Share locations for safety, with a built-in Ghost Mode.' },
  { Glyph: Baithak, label: 'Group memories',    description: 'Save high-res photos and react to squad moments.' },
]

export function ValueFramingScreen() {
  const { colors, spacing, text } = useTheme()
  const navigation = useNavigation<Nav>()

  // A/B copy variant state ('A' = Squad Hub, 'B' = Group Life)
  const [variant, setVariant] = useState<'A' | 'B'>('A')

  useEffect(() => {
    const selectedVariant = Math.random() < 0.5 ? 'A' : 'B'
    setVariant(selectedVariant)

    track('onboarding_started', {
      flow_variant: selectedVariant,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      step_index: 0,
    })
  }, [])

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    track('value_framing_completed', {
      flow_variant: variant,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      step_index: 0,
    })

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
      <View style={[styles.container, { paddingHorizontal: spacing['2xl'] }]}>
        {/* Flow-stitch — the first segment of the thread (§4.1) */}
        <View style={{ marginBottom: spacing.xl }}>
          <AuthProgress step={1} total={4} />
        </View>

        {/* Hero */}
        <Entrance index={0}>
          <Text style={[text.heading.sm, { color: colors.stitch, letterSpacing: 1, marginBottom: spacing.md }]}>
            apna
          </Text>
          <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            {heroLine}
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'], lineHeight: 22 }]}>
            {supportingLine}
          </Text>
        </Entrance>

        {/* Capabilities — Rows on fabric, brand glyphs, no boxes */}
        <View style={styles.highlights}>
          {HIGHLIGHTS.map(({ Glyph, label, description }, index) => (
            <Entrance key={label} index={index + 1}>
              <Row
                title={label}
                subtitle={description}
                leading={
                  <IconTile size={44}>
                    <Glyph size={22} color={colors.textPrimary} />
                  </IconTile>
                }
              />
            </Entrance>
          ))}
        </View>

        {/* CTA */}
        <Entrance index={HIGHLIGHTS.length + 1} style={styles.footer}>
          <Button
            label="Get started"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleGetStarted}
          />
          <Text style={[text.label.sm, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
            No spam. No ads. Just you and your group.
          </Text>
        </Entrance>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  highlights: {
    width: '100%',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
})
