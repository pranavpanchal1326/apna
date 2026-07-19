// src/screens/group/YearInReviewScreen.tsx
// Year in Review (PRD §17) — displays the auto-generated December recap.
// Data is server-generated (groups/{groupId}/yearInReview/{year}); this
// screen is read-only.

import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { CalendarBlank } from 'phosphor-react-native'
import { Screen, Header } from '@components'
import { useTheme } from '@theme'
import { fetchYearInReview, type YearInReview } from '@lib/firebase/yearInReview'
import { formatINR } from '@lib/utils/currency'
import type { HomeStackParamList } from '@navigation/types'

type Route = RouteProp<HomeStackParamList, 'YearInReview'>

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  stay: 'Stay',
  transport: 'Transport',
  activities: 'Activities',
  shopping: 'Shopping',
  misc: 'Misc',
}

export function YearInReviewScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const route = useRoute<Route>()
  const { groupId, year } = route.params

  const [review, setReview] = useState<YearInReview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchYearInReview(groupId, year).then((data) => {
      if (!cancelled) {
        setReview(data)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [groupId, year])

  if (isLoading) {
    return (
      <Screen>
        <Header title={`${year} in Review`} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} />
        </View>
      </Screen>
    )
  }

  if (!review) {
    return (
      <Screen>
        <Header title={`${year} in Review`} showBack />
        <View style={[styles.center, { padding: spacing.xl }]}>
          <CalendarBlank size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center' }]}>
            Not ready yet
          </Text>
          <Text
            style={[
              text.body.md,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            Your Year in Review is generated automatically every December. Check back then!
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title={`${year} in Review`} showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[styles.hero, { marginBottom: spacing.xl }]}>
          <Text style={{ fontSize: 56 }}>{review.coverEmoji ?? '🎉'}</Text>
          <Text style={[text.heading.lg, { color: colors.textPrimary, marginTop: spacing.sm }]}>
            {review.groupName}
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Your year together, wrapped
          </Text>
        </View>

        {/* Stats grid */}
        <View style={[styles.statsRow, { gap: spacing.sm, marginBottom: spacing.sm }]}>
          <StatCard
            emoji="💸"
            label="Total spent"
            value={formatINR(review.totalSpend)}
            colors={colors} text={text} spacing={spacing} radius={radius}
          />
          <StatCard
            emoji="🧾"
            label="Expenses split"
            value={String(review.expenseCount)}
            colors={colors} text={text} spacing={spacing} radius={radius}
          />
        </View>
        <View style={[styles.statsRow, { gap: spacing.sm, marginBottom: spacing.xl }]}>
          <StatCard
            emoji="📸"
            label="Memories captured"
            value={String(review.memoriesCount)}
            colors={colors} text={text} spacing={spacing} radius={radius}
          />
          <StatCard
            emoji="🏆"
            label="Top category"
            value={review.topCategory ? (CATEGORY_LABELS[review.topCategory] ?? review.topCategory) : '—'}
            colors={colors} text={text} spacing={spacing} radius={radius}
          />
        </View>

        {/* Top photos */}
        {review.topPhotoUrls.length > 0 && (
          <>
            <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              BEST MOMENTS
            </Text>
            <View style={[styles.photoGrid, { gap: spacing.sm }]}>
              {review.topPhotoUrls.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={[
                    styles.photo,
                    { borderRadius: radius.md, backgroundColor: colors.bgSecondary },
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

function StatCard({
  emoji,
  label,
  value,
  colors,
  text,
  spacing,
  radius,
}: {
  emoji: string
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
  text: ReturnType<typeof useTheme>['text']
  spacing: ReturnType<typeof useTheme>['spacing']
  radius: ReturnType<typeof useTheme>['radius']
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.hairline,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={[text.heading.sm, { color: colors.textPrimary, marginTop: spacing.xs }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center' },
  statsRow: { flexDirection: 'row' },
  statCard: { flex: 1, borderWidth: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  photo: { width: '48%', aspectRatio: 1, flexGrow: 1 },
})
