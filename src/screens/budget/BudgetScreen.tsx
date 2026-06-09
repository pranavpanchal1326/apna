// src/screens/budget/BudgetScreen.tsx
import { useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute, RouteProp } from '@react-navigation/native'
import { Screen, Header, Button } from '@components'
import { useTheme } from '@theme'
import { useGroupStore } from '@stores/group.store'
import { useBudget } from '@hooks/useBudget'
import {
  BudgetHeroCard,
  BudgetCategoryList,
  BudgetStatPill,
  BudgetEmptyState
} from '@components/budget'
import { getAverageExpense, getTopSpendingCategory } from '@lib/budget/selectors'
import { formatBudgetAmount } from '@lib/budget/format'
import { MainTabParamList } from '@navigation/types'

type BudgetScreenRouteProp = RouteProp<MainTabParamList, 'Budget'>

export function BudgetScreen() {
  const { colors, text, spacing } = useTheme()
  const route = useRoute<BudgetScreenRouteProp>()
  const activeGroupId = useGroupStore((s) => s.activeGroup?.id)
  
  // Use route param groupId or fallback to activeGroup from store
  const groupId = route.params?.groupId || activeGroupId || null

  const {
    group,
    summary,
    health,
    isLoading,
    error,
    refresh,
  } = useBudget(groupId)

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  if (!groupId) {
    return (
      <Screen>
        <Header title="Budget" />
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🎒</Text>
          <Text style={[text.heading.sm, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }]}>
            No active group
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', maxWidth: 280 }]}>
            Select or join a group from the Home tab to track its budget.
          </Text>
        </View>
      </Screen>
    )
  }

  if (isLoading && !refreshing && !summary) {
    return (
      <Screen>
        <Header title="Budget" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </Screen>
    )
  }

  if (error && !summary) {
    return (
      <Screen>
        <Header title="Budget" />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.accentDanger, textAlign: 'center', marginBottom: spacing.md }]}>
            {error}
          </Text>
          <Button variant="primary" label="Retry" onPress={refresh} />
        </View>
      </Screen>
    )
  }

  const currency = group?.currency || 'INR'
  const hasExpenses = summary && summary.expenseCount > 0

  return (
    <Screen>
      <Header title={group?.name ? `${group.name} Budget` : 'Trip Budget'} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        {summary && health && (
          <View style={{ gap: spacing.lg }}>
            {/* 1. Hero spend card */}
            <BudgetHeroCard
              totalBudget={summary.totalBudget}
              totalSpent={summary.totalSpent}
              remaining={summary.remaining}
              percentUsed={summary.percentUsed}
              overspend={summary.overspend}
              health={health}
              currency={currency}
            />

            {hasExpenses ? (
              <>
                {/* 2. Stat Pills row */}
                <View style={styles.statsRow}>
                  <BudgetStatPill
                    label="Expenses"
                    value={String(summary.expenseCount)}
                  />
                  <BudgetStatPill
                    label="Average"
                    value={formatBudgetAmount(
                      getAverageExpense(summary.totalSpent, summary.expenseCount),
                      currency
                    )}
                  />
                  <BudgetStatPill
                    label="Top Category"
                    value={
                      getTopSpendingCategory(summary.categoryTotals)?.label || 'None'
                    }
                    tone={
                      getTopSpendingCategory(summary.categoryTotals) ? 'warning' : 'neutral'
                    }
                  />
                </View>

                {/* 3. Category list */}
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
                    Spent by Category
                  </Text>
                  <BudgetCategoryList
                    items={summary.categoryTotals}
                    currency={currency}
                  />
                </View>
              </>
            ) : (
              <BudgetEmptyState mode="no_expenses" />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
})
