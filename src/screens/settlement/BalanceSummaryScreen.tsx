// src/screens/settlement/BalanceSummaryScreen.tsx
// Full balance screen for a group.
//
// Sections (top to bottom):
// 1. My balance hero — large teal/coral number, context label
// 2. "What I owe" — DebtRows for my debts (tappable → SettleUpSheet)
// 3. "Owed to me" — DebtRows where I'm the receiver
// 4. "All balances" — BalanceRow per member
// 5. "Settlement history" — recent settlements list
//
// This screen is navigated to from GroupHomeScreen Budget tab (Prompt 1.3)
// or from the balance card on GroupHomeScreen.

import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@theme'
import { Screen } from '@components'
import { BalanceRow, DebtRow, SettleUpSheet } from '@components/settlement'
import { useSettlements } from '@hooks/useSettlements'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import { formatBalanceHero } from '@lib/engine/balanceEngine'
import { feedTimestamp } from '@lib/utils/date'
import type { DebtSimplified } from '@lib/engine/balanceEngine'
import type { HomeStackScreenProps } from '@navigation/types'
import type { Timestamp } from 'firebase/firestore'

type Props = HomeStackScreenProps<'BalanceSummary'>

export function BalanceSummaryScreen({ route }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, radius, shadows } = useTheme()
  const navigation = useNavigation()
  const { user } = useAuth()
  const activeGroup = useGroupStore(s => s.activeGroup)
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const {
    summary,
    myDebts,
    owedToMe,
    myBalance,
    settlements,
    isSettling,
    settleUp,
  } = useSettlements(groupId, user?.uid ?? null)

  // SettleUpSheet state
  const [activeDebt, setActiveDebt] = useState<DebtSimplified | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const handleDebtPress = useCallback((debt: DebtSimplified) => {
    setActiveDebt(debt)
    setSheetVisible(true)
  }, [])

  const handleSettleConfirm = useCallback(async (amountRupees: number, note: string) => {
    if (!activeDebt || !user?.uid) return
    await settleUp({
      groupId,
      fromUid: activeDebt.fromUid,
      toUid: activeDebt.toUid,
      amountRupees,
      currency: activeGroup?.currency ?? 'INR',
      note: note || undefined,
      expenseIds: [],
    })
  }, [activeDebt, user?.uid, groupId, activeGroup?.currency, settleUp])

  // Auto-open sheet if withUid is passed in navigation params (e.g. from BalanceSummaryCard CTA)
  const withUid = route.params?.withUid
  useEffect(() => {
    if (withUid && myDebts.length > 0) {
      const matchingDebt = myDebts.find(d => d.toUid === withUid)
      if (matchingDebt) {
        setActiveDebt(matchingDebt)
        setSheetVisible(true)
      }
    }
  }, [withUid, myDebts])

  const myUid = user?.uid ?? ''

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: colors.accentPrimary, fontSize: 24, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
          Balances
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* My balance hero */}
        {myBalance && (
          <View style={[
            styles.heroCard,
            {
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.xl,
              borderColor: myBalance.isSettled
                ? colors.border
                : myBalance.isPayer
                  ? colors.accentPrimary + '30'
                  : colors.accentDanger + '30',
              borderWidth: 1.5,
              padding: spacing.xl,
              marginBottom: spacing.xl,
              alignItems: 'center',
              ...(myBalance.isSettled ? shadows.card : myBalance.isPayer ? shadows.accentGlow : shadows.card),
            },
          ]}>
            <Text style={[text.display.sm, {
              color: myBalance.isSettled
                ? colors.settled
                : myBalance.isPayer
                  ? colors.positive
                  : colors.negative,
              fontVariant: ['tabular-nums'],
            }]}>
              {myBalance.isSettled ? 'All clear ✓' : formatBalanceHero(myBalance.netPaise)}
            </Text>
            <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {myBalance.isSettled
                ? "You're fully settled in this group"
                : myBalance.isPayer
                  ? 'the group owes you'
                  : 'you owe the group'}
            </Text>
          </View>
        )}

        {/* What I owe */}
        {myDebts.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 }]}>
              YOU OWE
            </Text>
            {myDebts.map(debt => (
              <DebtRow
                key={`${debt.fromUid}-${debt.toUid}`}
                debt={debt}
                fromUser={members.get(debt.fromUid)}
                toUser={members.get(debt.toUid)}
                myUid={myUid}
                onSettle={handleDebtPress}
              />
            ))}
          </View>
        )}

        {/* Owed to me */}
        {owedToMe.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg, letterSpacing: 0.5 }]}>
              OWED TO YOU
            </Text>
            {owedToMe.map(debt => (
              <DebtRow
                key={`${debt.fromUid}-${debt.toUid}`}
                debt={debt}
                fromUser={members.get(debt.fromUid)}
                toUser={members.get(debt.toUid)}
                myUid={myUid}
              />
            ))}
          </View>
        )}

        {/* All balances */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg, letterSpacing: 0.5 }]}>
          ALL BALANCES
        </Text>
        <View style={{
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.xl,
        }}>
          {summary.balances.map(balance => (
            <BalanceRow
              key={balance.uid}
              balance={balance}
              user={members.get(balance.uid)}
              isMe={balance.uid === myUid}
            />
          ))}
        </View>

        {/* Total group spend */}
        <View style={[styles.totalRow, {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          padding: spacing.md,
          marginBottom: spacing.xl,
        }]}>
          <Text style={[text.body.sm, { color: colors.textSecondary }]}>Total group spend</Text>
          <Text style={[text.mono.md, { color: colors.textPrimary, fontVariant: ['tabular-nums'] }]}>
            ₹{summary.totalExpensesRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Settlement history */}
        {settlements.length > 0 && (
          <>
            <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 }]}>
              SETTLEMENT HISTORY
            </Text>
            {settlements.slice(0, 10).map(s => {
              const from = members.get(s.fromUid)
              const to = members.get(s.toUid)
              const ts = s.createdAt as unknown as Timestamp
              return (
                <View key={s.id} style={[styles.historyRow, {
                  paddingVertical: spacing.sm,
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                }]}>
                  <Text style={[text.body.sm, { color: colors.textPrimary, flex: 1 }]}>
                    {s.fromUid === myUid ? 'You' : from?.name.split(' ')[0] ?? '?'}
                    {' paid '}
                    {s.toUid === myUid ? 'you' : to?.name.split(' ')[0] ?? '?'}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[text.mono.sm, { color: colors.positive, fontVariant: ['tabular-nums'] }]}>
                      ₹{s.amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
                      {ts?.toDate ? feedTimestamp(ts.toDate()) : ''}
                    </Text>
                  </View>
                </View>
              )
            })}
          </>
        )}
      </ScrollView>

      {/* SettleUpSheet */}
      <SettleUpSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setActiveDebt(null) }}
        debt={activeDebt}
        fromUser={activeDebt ? members.get(activeDebt.fromUid) : undefined}
        toUser={activeDebt ? members.get(activeDebt.toUid) : undefined}
        groupId={groupId}
        onConfirm={handleSettleConfirm}
        isSettling={isSettling}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCard:   {},
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
})
