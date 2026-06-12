// src/components/referral/ReferralDashboard.tsx
// Compact referral section for Profile / Settings.

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '@theme'
import { Button } from '@components'
import { useReferral } from '@hooks/useReferral'
import type { ReferralStats } from '@lib/schemas/referral.schema'

export function ReferralDashboard() {
  const { colors, text, spacing, radius } = useTheme()
  const {
    link,
    stats,
    isLoading,
    error,
    shareReferral,
    copyReferralLink,
    rewardRuleText,
  } = useReferral()

  if (isLoading && !link) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderRadius: radius.lg, borderColor: colors.border, padding: spacing.lg }]}>
        <ActivityIndicator color={colors.accentPrimary} />
      </View>
    )
  }

  if (error && !link) {
    return null
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        },
      ]}
    >
      <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Invite friends
      </Text>
      <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Share apna naturally — rewards unlock when friends actually use it.
      </Text>

      {link && (
        <View
          style={[
            styles.codeBox,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: 4 }]}>
            Your link
          </Text>
          <Text
            style={[text.body.sm, { color: colors.textPrimary }]}
            numberOfLines={2}
            selectable
          >
            {link.url}
          </Text>
        </View>
      )}

      <View style={[styles.actions, { gap: spacing.sm, marginBottom: spacing.md }]}>
        <Button
          variant="primary"
          size="md"
          label="Share link"
          fullWidth
          onPress={() => shareReferral('share_sheet', 'profile')}
        />
        <Button
          variant="secondary"
          size="md"
          label="Copy link"
          fullWidth
          onPress={() => copyReferralLink('copy_link', 'profile')}
        />
      </View>

      {stats && <StatsGrid stats={stats} />}

      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.md, fontSize: 12 }]}>
        {rewardRuleText}
      </Text>
    </View>
  )
}

function StatsGrid({ stats }: { stats: ReferralStats }) {
  const { colors, text, spacing } = useTheme()

  const items = [
    { label: 'Invited', value: stats.captured + stats.qualified + stats.rewarded },
    { label: 'Qualified', value: stats.qualified + stats.rewarded },
    { label: 'Rewards', value: stats.rewarded },
    { label: 'Pending', value: stats.pending },
  ]

  return (
    <View style={[styles.statsRow, { gap: spacing.sm }]}>
      {items.map((item) => (
        <View key={item.label} style={styles.statCell}>
          <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{item.value}</Text>
          <Text style={[text.label.sm, { color: colors.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  codeBox: {},
  actions: {},
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
})
