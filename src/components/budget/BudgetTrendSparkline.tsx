// src/components/budget/BudgetTrendSparkline.tsx
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import type { BudgetForecastPoint } from '@lib/budget'

interface BudgetTrendSparklineProps {
  points: BudgetForecastPoint[]
}

export function BudgetTrendSparkline({ points }: BudgetTrendSparklineProps) {
  const { colors, radius } = useTheme()

  if (points.length < 2) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.bgTertiary, borderRadius: radius.sm }]}>
        <View style={[styles.placeholderLine, { backgroundColor: colors.border }]} />
      </View>
    )
  }

  // Find max spend to scale the heights
  const maxSpend = Math.max(...points.map((p) => p.spendRupees), 1)

  return (
    <View style={styles.container}>
      {points.map((p, idx) => {
        // Capped minimum height at 10% for visual presence
        const heightPercent = `${Math.max(12, (p.spendRupees / maxSpend) * 100)}%`
        return (
          <View key={idx} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: heightPercent as any,
                  backgroundColor: colors.accentPrimary,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                },
              ]}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    minWidth: 60,
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
  },
  placeholder: {
    height: 24,
    minWidth: 60,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  placeholderLine: {
    height: 2,
    width: '100%',
    opacity: 0.5,
  },
})
