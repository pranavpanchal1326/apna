// src/components/budget/BudgetForecastCard.tsx
import { View, Text, StyleSheet } from 'react-native'
import { Card } from '../ui/Card'
import { useTheme } from '@theme'
import { formatBudgetAmount } from '@lib/budget/format'
import type { BudgetForecastResult } from '@lib/budget/forecast'
import { BudgetBurnChip } from './BudgetBurnChip'
import { BudgetTrendSparkline } from './BudgetTrendSparkline'
import type { BurnRateResult } from '@lib/budget/burnRate'
import type { BudgetForecastPoint } from '@lib/budget/forecast'

interface BudgetForecastCardProps {
  forecast: BudgetForecastResult | null
  burnRate?: BurnRateResult | null
  points?: BudgetForecastPoint[]
  currency?: string
}

export function BudgetForecastCard({
  forecast,
  burnRate,
  points = [],
  currency = 'INR',
}: BudgetForecastCardProps) {
  const { colors, spacing, text, radius } = useTheme()

  if (!forecast) {
    return (
      <Card
        style={styles.card}
        contentStyle={{ borderWidth: 1, borderColor: colors.border, padding: spacing.lg }}
      >
        <Text style={[text.body.sm, { color: colors.textMuted, textAlign: 'center' }]}>
          Not enough expense history to calculate a forecast. Keep tracking expenses to see projections.
        </Text>
      </Card>
    )
  }

  const {
    averageDailySpend,
    projectedTripSpend,
    projectedOverrun,
    confidence,
    daysOfRunway,
  } = forecast

  const hasOverrun = projectedOverrun !== null && projectedOverrun > 0
  const confidenceColorMap = {
    low: colors.textMuted,
    medium: colors.accentGold,
    high: colors.accentPrimary,
  }

  return (
    <Card
      style={styles.card}
      contentStyle={{
        borderWidth: 1,
        borderColor: hasOverrun ? `${colors.accentDanger}33` : colors.border,
        padding: spacing.lg,
      }}
    >
      <View style={[styles.headerRow, { marginBottom: spacing.sm }]}>
        <Text style={[text.label.sm, { color: colors.textSecondary, letterSpacing: 1 }]}>
          FORECAST & PACE
        </Text>
        <View style={styles.headerRight}>
          {points && points.length > 0 && <BudgetTrendSparkline points={points} />}
          {burnRate && <BudgetBurnChip pace={burnRate.paceLabel} />}
        </View>
      </View>

      {/* Primary Forecast Metrics */}
      <View style={[styles.mainMetrics, { marginTop: spacing.md }]}>
        <View style={styles.metricBlock}>
          <Text style={[text.body.sm, { color: colors.textSecondary }]}>Avg. Daily Spend</Text>
          <Text style={[text.mono.md, { color: colors.textPrimary, fontSize: 18, marginTop: 2 }]}>
            {formatBudgetAmount(averageDailySpend, currency)}
          </Text>
        </View>

        {projectedTripSpend !== null && (
          <View style={styles.metricBlock}>
            <Text style={[text.body.sm, { color: colors.textSecondary }]}>Projected Total</Text>
            <Text style={[text.mono.md, { color: colors.textPrimary, fontSize: 18, marginTop: 2 }]}>
              {formatBudgetAmount(projectedTripSpend, currency)}
            </Text>
          </View>
        )}
      </View>

      {/* Warning/Overrun indicator */}
      {hasOverrun && (
        <View
          style={[
            styles.overrunBanner,
            {
              backgroundColor: `${colors.accentDanger}0A`,
              borderColor: `${colors.accentDanger}33`,
              borderRadius: radius.sm,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text style={[text.body.sm, { color: colors.accentDanger, fontWeight: 'bold' }]}>
            Projected overrun: {formatBudgetAmount(projectedOverrun!, currency)}
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
            At this pace, you will overshoot the budget.
          </Text>
        </View>
      )}

      {/* Runway and Confidence indicators */}
      <View
        style={[
          styles.footer,
          {
            marginTop: spacing.md,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: spacing.md,
          },
        ]}
      >
        {daysOfRunway !== null && (
          <View style={styles.row}>
            <Text style={[text.body.sm, { color: colors.textSecondary }]}>Runway:</Text>
            <Text
              style={[
                text.body.sm,
                { color: daysOfRunway === 0 ? colors.accentDanger : colors.textPrimary, fontWeight: 'bold' },
              ]}
            >
              {daysOfRunway === 0 ? 'Exceeded' : `${daysOfRunway} day${daysOfRunway !== 1 ? 's' : ''} left`}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={[text.body.sm, { color: colors.textSecondary }]}>Confidence:</Text>
          <Text
            style={[
              text.label.md,
              { color: confidenceColorMap[confidence], fontWeight: 'bold', textTransform: 'capitalize' },
            ]}
          >
            {confidence}
          </Text>
        </View>
      </View>

      {confidence === 'low' && (
        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' }]}>
          * Projections are low confidence due to limited expense dates.
        </Text>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBlock: {
    flex: 1,
  },
  overrunBanner: {
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})
