// src/components/budget/BudgetHeroCard.tsx
import { View, Text, StyleSheet } from 'react-native'
import { Card } from '../ui/Card'
import { useTheme } from '@theme'
import { formatBudgetAmount, formatPercent } from '@lib/budget/format'
import type { BudgetHealthMeta } from '@lib/budget/status'

interface BudgetHeroCardProps {
  totalBudget: number | null
  totalSpent: number
  remaining: number | null
  percentUsed: number
  overspend: number
  health: BudgetHealthMeta
  currency?: string
}

export function BudgetHeroCard({
  totalBudget,
  totalSpent,
  remaining,
  percentUsed,
  overspend,
  health,
  currency = 'INR',
}: BudgetHeroCardProps) {
  const { colors, spacing, text, radius } = useTheme()

  // Determine health tone colors
  let accentColor: string = colors.textSecondary
  if (health.tone === 'positive') {
    accentColor = colors.accentPrimary
  } else if (health.tone === 'warning') {
    accentColor = colors.accentGold
  } else if (health.tone === 'danger') {
    accentColor = colors.accentDanger
  }

  const hasBudget = totalBudget !== null && totalBudget > 0

  return (
    <Card
      style={styles.card}
      contentStyle={{
        ...styles.cardContent,
        borderColor: health.tone === 'danger' ? `${colors.accentDanger}44` : colors.border,
        padding: spacing.xl,
      }}
    >
      <View style={styles.header}>
        <Text style={[text.body.sm, { color: colors.textSecondary }]}>
          {hasBudget ? 'Spent so far' : 'Spent so far'}
        </Text>
        {hasBudget && (
          <Text style={[text.mono.sm, { color: colors.textSecondary }]}>
            {formatPercent(percentUsed)} used
          </Text>
        )}
      </View>

      <Text style={[text.heading.lg, { fontSize: 36, color: colors.textPrimary, marginVertical: spacing.xs }]}>
        {formatBudgetAmount(totalSpent, currency)}
      </Text>

      {hasBudget && totalBudget !== null ? (
        <>
          {/* Progress bar */}
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: colors.bgTertiary, borderRadius: radius.full, height: 8, marginVertical: spacing.sm },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: accentColor,
                  borderRadius: radius.full,
                  width: `${Math.min(percentUsed, 100)}%`,
                },
              ]}
            />
          </View>

          {/* Budget status info */}
          <View style={styles.footerRow}>
            {overspend > 0 ? (
              <View>
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>Over by</Text>
                <Text style={[text.body.sm, { color: colors.accentDanger, fontWeight: 'bold' }]}>
                  {formatBudgetAmount(overspend, currency)}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[text.body.sm, { color: colors.textPrimary, fontWeight: 'bold' }]}>
                  {formatBudgetAmount(remaining ?? 0, currency)}
                </Text>
              </View>
            )}
            <View>
              <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'right' }]}>Total Budget</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'right' }]}>
                {formatBudgetAmount(totalBudget, currency)}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[text.body.sm, { color: colors.textMuted }]}>
            Set a trip budget in settings to track progress.
          </Text>
        </View>
      )}

      {/* Health subtitle/tone bar */}
      <View
        style={[
          styles.healthContainer,
          {
            backgroundColor: colors.bgTertiary,
            borderRadius: radius.md,
            padding: spacing.md,
            marginTop: spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: accentColor,
          },
        ]}
      >
        <Text style={[text.body.sm, { color: colors.textPrimary, fontWeight: 'bold' }]}>
          {health.title}
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
          {health.subtitle}
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  cardContent: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  healthContainer: {
    flexDirection: 'column',
  },
})
