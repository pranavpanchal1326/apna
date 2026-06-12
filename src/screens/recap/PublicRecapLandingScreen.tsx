// src/screens/recap/PublicRecapLandingScreen.tsx
// Minimal public recap view for non-users and shared links.

import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Screen, Button } from '@components'
import { useTheme } from '@theme'
import { PublicRecapCard, PUBLIC_RECAP_CARD_WIDTH, PUBLIC_RECAP_CARD_HEIGHT } from '@components/recap'
import { fetchPublicRecapBySlug } from '@lib/firebase/tripRecap'
import type { PublicRecap } from '@lib/schemas/publicRecap.schema'

interface PublicRecapLandingScreenProps {
  slug: string
  onClose?: () => void
}

export function PublicRecapLandingScreen({ slug, onClose }: PublicRecapLandingScreenProps) {
  const { colors, text, spacing, radius } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const [recap, setRecap] = useState<PublicRecap | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    void fetchPublicRecapBySlug(slug).then((data) => {
      if (!mounted) return
      if (!data) {
        setNotFound(true)
      } else {
        setRecap(data)
      }
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [slug])

  const previewScale = (screenWidth - spacing.lg * 2) / PUBLIC_RECAP_CARD_WIDTH

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading trip recap...
          </Text>
        </View>
      </Screen>
    )
  }

  if (notFound || !recap) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🗺️</Text>
          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center' }]}>
            Recap not available
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 }]}>
            This recap may be private or the link has expired.
          </Text>
          {onClose ? (
            <Button variant="secondary" label="Go back" onPress={onClose} style={{ marginTop: spacing.xl }} />
          ) : null}
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {onClose ? (
          <Pressable onPress={onClose} style={{ marginBottom: spacing.md }}>
            <Text style={[text.body.md, { color: colors.accentPrimary }]}>← Back</Text>
          </Pressable>
        ) : null}

        <Text style={[text.heading.md, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          {recap.tripName}
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          {recap.destination ? `${recap.destination} · ` : ''}{recap.dateRangeLabel}
        </Text>

        <View
          style={{
            height: PUBLIC_RECAP_CARD_HEIGHT * previewScale,
            width: PUBLIC_RECAP_CARD_WIDTH * previewScale,
            alignSelf: 'center',
            overflow: 'hidden',
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              transform: [{ scale: previewScale }],
              transformOrigin: 'top left',
            }}
          >
            <PublicRecapCard recap={recap} />
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary, borderRadius: radius.lg, borderColor: colors.border, padding: spacing.lg }]}>
          <StatRow label="Friends" value={String(recap.memberCount)} colors={colors} text={text} />
          <StatRow label="Memories" value={String(recap.memoriesCount)} colors={colors} text={text} />
          <StatRow label="Places" value={String(recap.placesCount)} colors={colors} text={text} />
          <StatRow label="Days" value={String(recap.daysCount)} colors={colors} text={text} last />
        </View>

        <View style={[styles.cta, { marginTop: spacing.xl }]}>
          <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
            Plan trips, split costs, and keep memories together on apna.
          </Text>
          <Button
            variant="primary"
            label="Get apna"
            fullWidth
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              void Linking.openURL('https://apna.app')
            }}
          />
        </View>
      </View>
    </Screen>
  )
}

function StatRow({
  label,
  value,
  colors,
  text,
  last = false,
}: {
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
  text: ReturnType<typeof useTheme>['text']
  last?: boolean
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={[text.body.sm, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[text.body.sm, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statsCard: {
    borderWidth: 1,
  },
  cta: {},
})
