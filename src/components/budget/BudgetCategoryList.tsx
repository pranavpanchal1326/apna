// src/components/budget/BudgetCategoryList.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { formatBudgetAmount } from '@lib/budget/format'
import type { BudgetCategoryTotal } from '@lib/budget/selectors'

interface BudgetCategoryListProps {
  items: BudgetCategoryTotal[]
  currency?: string
}

export function BudgetCategoryList({ items, currency = 'INR' }: BudgetCategoryListProps) {
  const { colors, spacing, text, radius } = useTheme()

  const CATEGORY_COLORS: Record<string, string> = {
    food: colors.category?.food || '#FF6B6B',
    stay: colors.category?.stay || '#4ECDC4',
    transport: colors.category?.transport || '#45B7D1',
    activities: colors.category?.activities || '#96CEB4',
    shopping: colors.category?.shopping || '#FFEEAD',
    misc: colors.category?.misc || '#D4D4D4',
  }

  // Filter categories with positive amounts
  const activeItems = items.filter((item) => item.amount > 0)

  if (activeItems.length === 0) {
    return (
      <View style={[styles.emptyContainer, { padding: spacing.xl, backgroundColor: colors.bgSecondary, borderRadius: radius.lg, borderColor: colors.border }]}>
        <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center' }]}>
          No category spend recorded yet.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {activeItems.map((item) => {
        const catColor = CATEGORY_COLORS[item.key] ?? '#D4D4D4'
        return (
          <View
            key={item.key}
            style={[styles.row, { marginBottom: spacing.md }]}
          >
            {/* Category header info */}
            <View style={styles.rowHeader}>
              <View style={styles.leftInfo}>
                <View style={[styles.dot, { backgroundColor: catColor }]} />
                <Text style={[text.body.sm, { color: colors.textPrimary, fontWeight: 'bold' }]}>
                  {item.label}
                </Text>
                <Text style={[text.body.sm, { color: colors.textMuted, marginLeft: spacing.xs }]}>
                  ({item.count} item{item.count !== 1 ? 's' : ''})
                </Text>
              </View>
              <View style={styles.rightInfo}>
                <Text style={[text.mono.sm, { color: colors.textPrimary }]}>
                  {formatBudgetAmount(item.amount, currency)}
                </Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginLeft: spacing.xs, width: 44, textAlign: 'right' }]}>
                  {Math.round(item.percentOfSpend)}%
                </Text>
              </View>
            </View>

            {/* Custom progress rail for category */}
            <View
              style={[
                styles.rail,
                { backgroundColor: colors.bgTertiary, borderRadius: radius.full, height: 6, marginTop: spacing.xs },
              ]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: catColor,
                    borderRadius: radius.full,
                    width: `${Math.min(item.percentOfSpend, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'column',
    width: '100%',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rail: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  emptyContainer: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
