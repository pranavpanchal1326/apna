// src/screens/group/BudgetScreen.tsx
// PRD §9.5 — Budget screen: balance summary, category breakdown, settle-up list
// Subscribes to /groups/{groupId}/settlements/latest in real-time.
// All amounts from settlementEngine — never recomputed on client.

import { useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@theme'
import { Screen, Header } from '@components'
import { SettlementCard } from '@components/ui/SettlementCard'
import { Avatar } from '@components/ui/Avatar'
import { useBudget } from '@hooks/useBudget'
import { useAuthStore } from '@stores/auth.store'
import { formatAmount } from '@lib/utils/date'
import type { GroupStackParamList } from '@navigation/types'
import type { SettlementItem } from '@lib/firebase/settlements'

interface BudgetScreenProps {
  groupId:      string
  groupName:    string
  totalBudget?: number
}

export function BudgetScreen({ groupId }: BudgetScreenProps) {
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<GroupStackParamList>>()
  const currentUser = useAuthStore((s) => s.user)

  const {
    isLoading, error, balances, pendingSettlements,
    recordedSettlements, categories, budget,
    totalSpentRupees, totalBudgetRupees, expenseCount,
  } = useBudget(groupId)

  const handleSettlementPress = useCallback((settlement: SettlementItem) => {
    navigation.navigate('SettleUp', {
      groupId,
      fromUid:   settlement.fromUid,
      toUid:     settlement.toUid,
      fromName:  settlement.fromName,
      toName:    settlement.toName,
      amountPaise: settlement.amountPaise,
    })
  }, [groupId])

  // ── Category color map (matches DarkColors.category) ──────────
  const CATEGORY_COLORS: Record<string, string> = {
    food:       colors.category?.food || '#FF6B6B',
    stay:       colors.category?.stay || '#4ECDC4',
    transport:  colors.category?.transport || '#45B7D1',
    activities: colors.category?.activities || '#96CEB4',
    shopping:   colors.category?.shopping || '#FFEEAD',
    misc:       colors.category?.misc || '#D4D4D4',
  }

  if (isLoading) {
    return (
      <Screen>
        <Header title="Budget" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
        </View>
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen>
        <Header title="Budget" />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.accentDanger }]}>{error}</Text>
        </View>
      </Screen>
    )
  }

  const myBalance = balances.find((b) => b.uid === currentUser?.uid)

  return (
    <Screen>
      <Header title="Budget" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero spend card ─────────────────────────────────── */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.bgSecondary,
              borderRadius:    radius.xl,
              padding:         spacing.xl,
              marginBottom:    spacing.xl,
              borderWidth:     1,
              borderColor:     budget?.isOverBudget ? `${colors.accentDanger}44` : colors.borderAccent,
              ...shadows.elevated,
            },
          ]}
        >
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Total Spent
          </Text>
          <Text style={[text.mono.lg, { color: colors.textPrimary, fontSize: 36 }]}>
            {formatAmount(totalSpentRupees)}
          </Text>

          {totalBudgetRupees != null && (
            <>
              <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]}>
                of {formatAmount(totalBudgetRupees)} budget
                {budget?.isOverBudget ? ' — over budget!' : ''}
              </Text>
              {/* Budget progress bar */}
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.bgTertiary, borderRadius: radius.full, marginTop: spacing.md },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:       `${Math.min(budget?.percentageUsed ?? 0, 100)}%`,
                      backgroundColor: budget?.isOverBudget ? colors.accentDanger : colors.accentPrimary,
                      borderRadius: radius.full,
                    },
                  ]}
                />
              </View>
            </>
          )}

          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.sm }]}>
            {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* ── My balance ─────────────────────────────────────── */}
        {myBalance && (
          <View
            style={[
              styles.myBalanceCard,
              {
                backgroundColor: colors.bgSecondary,
                borderRadius:    radius.lg,
                padding:         spacing.lg,
                marginBottom:    spacing.xl,
                borderWidth:     1,
                borderColor:     myBalance.netPaise >= 0
                  ? `${colors.accentPrimary}44`
                  : `${colors.accentDanger}44`,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[text.label.md, { color: colors.textSecondary }]}>Your balance</Text>
            <Text
              style={[
                text.mono.lg,
                {
                  color:     myBalance.netPaise >= 0 ? colors.accentPrimary : colors.accentDanger,
                  fontSize:  24,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {myBalance.netPaise >= 0 ? '+' : ''}{formatAmount(myBalance.netPaise / 100)}
            </Text>
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
              {myBalance.netPaise > 0
                ? 'others owe you'
                : myBalance.netPaise < 0
                ? 'you owe others'
                : 'all settled up ✓'}
            </Text>
          </View>
        )}

        {/* ── Category breakdown ─────────────────────────────── */}
        {categories.length > 0 && (
          <>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              Spent by category
            </Text>
            {categories.map((cat) => (
              <View
                key={cat.category}
                style={[styles.categoryRow, { marginBottom: spacing.sm }]}
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: CATEGORY_COLORS[cat.category] ?? colors.textMuted },
                    ]}
                  />
                  <Text style={[text.body.sm, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
                    {cat.category}
                  </Text>
                  <Text style={[text.label.sm, { color: colors.textMuted, marginLeft: spacing.xs }]}>
                    ({cat.count})
                  </Text>
                </View>
                <View style={styles.categoryRight}>
                  <View
                    style={[
                      styles.categoryBar,
                      {
                        backgroundColor: colors.bgTertiary,
                        borderRadius:    radius.full,
                        width:           100,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width:           cat.percentage,
                        height:          6,
                        backgroundColor: CATEGORY_COLORS[cat.category] ?? colors.textMuted,
                        borderRadius:    radius.full,
                      }}
                    />
                  </View>
                  <Text style={[text.mono.sm, { color: colors.textSecondary, marginLeft: spacing.sm, width: 72, textAlign: 'right' }]}>
                    {formatAmount(cat.totalPaise / 100)}
                  </Text>
                </View>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.xl }]} />
          </>
        )}

        {/* ── Settle Up ──────────────────────────────────────── */}
        {pendingSettlements.length > 0 && (
          <>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              Settle up ({pendingSettlements.length})
            </Text>
            {pendingSettlements.map((s, i) => (
              <SettlementCard
                key={`${s.fromUid}-${s.toUid}-${i}`}
                settlement={s}
                currentUid={currentUser?.uid ?? ''}
                onPress={handleSettlementPress}
              />
            ))}
          </>
        )}

        {pendingSettlements.length === 0 && expenseCount > 0 && (
          <View style={[styles.settledBanner, { backgroundColor: `${colors.accentPrimary}15`, borderRadius: radius.lg, padding: spacing.lg }]}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={[text.heading.sm, { color: colors.accentPrimary, marginTop: spacing.xs }]}>
              All settled up!
            </Text>
            <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              No pending payments in this group.
            </Text>
          </View>
        )}

        {/* ── Recorded settlements ───────────────────────────── */}
        {recordedSettlements.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.xl }]} />
            <Text style={[text.label.lg, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Recorded payments
            </Text>
            {recordedSettlements.map((s, i) => (
              <SettlementCard
                key={`recorded-${s.fromUid}-${s.toUid}-${i}`}
                settlement={s}
                currentUid={currentUser?.uid ?? ''}
                onPress={() => {}}
                isRecorded
              />
            ))}
          </>
        )}

        {/* ── Per-member balances ────────────────────────────── */}
        {balances.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.xl }]} />
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              Member balances
            </Text>
            {balances.map((b) => (
              <View
                key={b.uid}
                style={[
                  styles.memberBalance,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderRadius:    radius.md,
                    padding:         spacing.md,
                    marginBottom:    spacing.sm,
                    borderWidth:     1,
                    borderColor:     colors.border,
                  },
                ]}
              >
                <View style={styles.memberLeft}>
                  <Avatar name={b.displayName} color={b.avatarColor} size="sm" />
                  <Text style={[text.body.sm, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                    {b.displayName}
                  </Text>
                </View>
                <Text
                  style={[
                    text.mono.sm,
                    {
                      color: b.netPaise > 0
                        ? colors.accentPrimary
                        : b.netPaise < 0
                        ? colors.accentDanger
                        : colors.settled,
                    },
                  ]}
                >
                  {b.netPaise > 0 ? '+' : ''}{formatAmount(b.netPaise / 100)}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard:       {},
  myBalanceCard:  {},
  progressBar:    { height: 6, width: '100%', overflow: 'hidden' },
  progressFill:   { height: '100%' },
  categoryRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  categoryRight:  { flexDirection: 'row', alignItems: 'center' },
  categoryBar:    { height: 6, overflow: 'hidden' },
  divider:        { height: 1, width: '100%' },
  settledBanner:  { alignItems: 'center' },
  memberBalance:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberLeft:     { flexDirection: 'row', alignItems: 'center' },
})
