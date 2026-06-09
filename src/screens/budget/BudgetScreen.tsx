// src/screens/budget/BudgetScreen.tsx
import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useRoute, RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Screen, Header, Button } from '@components'
import { useTheme } from '@theme'
import { useGroupStore } from '@stores/group.store'
import { useBudget } from '@hooks/useBudget'
import { useAuth } from '@hooks/useAuth'
import { useBudgetAlerts } from '@hooks/useBudgetAlerts'
import { useBudgetForecast } from '@hooks/useBudgetForecast'
import { track } from '@lib/analytics'
import { updateGroupBudget } from '@lib/firebase/budget'
import {
  BudgetHeroCard,
  BudgetCategoryList,
  BudgetStatPill,
  BudgetEmptyState,
  BudgetAlertCard,
  BudgetPermissionHint,
  EditBudgetSheet,
  BudgetForecastCard,
} from '@components/budget'
import { getAverageExpense, getTopSpendingCategory } from '@lib/budget/selectors'
import { formatBudgetAmount } from '@lib/budget/format'
import { canEditBudget } from '@lib/budget/permissions'
import { MainTabParamList } from '@navigation/types'

type BudgetScreenRouteProp = RouteProp<MainTabParamList, 'Budget'>

export function BudgetScreen() {
  const { colors, text, spacing } = useTheme()
  const route = useRoute<BudgetScreenRouteProp>()
  const activeGroupId = useGroupStore((s) => s.activeGroup?.id)
  const { user } = useAuth()
  const myUid = user?.uid || null
  
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

  const {
    forecast,
    burnRate,
    points,
  } = useBudgetForecast(groupId)

  // Analytics tracking for forecasting & burn rate
  useEffect(() => {
    if (groupId && forecast) {
      const properties: Record<string, string | number | boolean> = {
        groupId,
        confidence: forecast.confidence,
      }
      if (forecast.projectedOverrun !== null) {
        properties.projectedOverrun = forecast.projectedOverrun
      }
      if (forecast.daysOfRunway !== null) {
        properties.runwayDays = forecast.daysOfRunway
      }
      track('budget-forecast-viewed', properties)
    }
  }, [groupId, forecast])

  useEffect(() => {
    if (groupId && burnRate) {
      track('budget-burn-chip-viewed', {
        groupId,
        pace: burnRate.paceLabel,
      })
    }
  }, [groupId, burnRate])

  useEffect(() => {
    if (groupId && points && points.length > 0) {
      track('budget-trend-inspected', {
        groupId,
        dataPointsCount: points.length,
      })
    }
  }, [groupId, points])

  const [refreshing, setRefreshing] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const isGroupAdmin = group
    ? canEditBudget({ uid: myUid, createdBy: group.createdBy, adminIds: group.adminIds })
    : false

  const currency = group?.currency || 'INR'

  const alerts = useBudgetAlerts({
    summary,
    health,
  })

  const handleEditPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const hadBudget = summary ? summary.totalBudget !== null && summary.totalBudget > 0 : false
    track('budget-edit-opened', {
      hadBudget,
      currency,
      groupId: groupId || '',
    })
    setSheetVisible(true)
  }, [summary, currency, groupId])

  const handleSubmit = useCallback(async (value: string | null) => {
    if (!groupId || !myUid) return
    setIsSaving(true)

    const hadBudget = summary ? summary.totalBudget !== null && summary.totalBudget > 0 : false
    const overspendBefore = summary ? summary.overspend > 0 : false

    try {
      if (value === null) {
        // Remove budget
        await updateGroupBudget({
          groupId,
          totalBudget: null,
          updatedByUid: myUid,
        })
        track('budget-removed', {
          hadBudget,
          currency,
          groupId,
          overspendBefore,
        })
      } else {
        // Save budget
        const parsed = parseFloat(value)
        await updateGroupBudget({
          groupId,
          totalBudget: parsed,
          updatedByUid: myUid,
        })
        track('budget-saved', {
          hadBudget,
          currency,
          groupId,
          overspendBefore,
        })
      }
      setSheetVisible(false)
      refresh()
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save budget changes.')
    } finally {
      setIsSaving(false)
    }
  }, [groupId, myUid, summary, currency, refresh])

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

  const hasExpenses = summary && summary.expenseCount > 0
  const hasBudget = summary ? summary.totalBudget !== null && summary.totalBudget > 0 : false

  return (
    <Screen>
      <Header
        title={group?.name ? `${group.name} Budget` : 'Trip Budget'}
        rightAction={
          isGroupAdmin ? (
            <Pressable
              onPress={handleEditPress}
              style={styles.headerButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel={hasBudget ? 'Edit budget' : 'Set budget'}
            >
              <Text style={[text.label.lg, { color: colors.accentPrimary }]}>
                {hasBudget ? 'Edit' : 'Set'}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
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

            {/* 2. Warning banner alert */}
            {alerts.visible && (
              <BudgetAlertCard
                title={alerts.title}
                message={alerts.message}
                tone={alerts.tone}
              />
            )}

            {/* 3. Forecast Card (with inline sparkline and burn chip) */}
            {hasExpenses && (
              <BudgetForecastCard
                forecast={forecast}
                burnRate={burnRate}
                points={points}
                currency={currency}
              />
            )}

            {hasExpenses ? (
              <>
                {/* 3. Stat Pills row */}
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

                {/* 4. Category list */}
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

            {/* 5. Permission hint for standard members */}
            <BudgetPermissionHint visible={!isGroupAdmin} />

            {/* 6. Supportive note */}
            <Text style={[text.body.sm, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }]}>
              Trip budget calculations are based on actual expenses and exclude settle up transfers.
            </Text>
          </View>
        )}
      </ScrollView>

      {isGroupAdmin && group && myUid && (
        <EditBudgetSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          initialValue={summary?.totalBudget ? String(summary.totalBudget) : ''}
          currency={currency}
          canRemove={hasBudget}
          isSaving={isSaving}
          onSubmit={handleSubmit}
        />
      )}
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
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
})

