// src/screens/settlement/BalanceSummaryScreen.tsx
// Kora & Ink balances — Blueprint §4.6.1.
// Hero: my net Amount ("You're owed ₹1,200"). Then two clusters under
// StitchLabels — OWED TO YOU (leaf) and YOU OWE (madder) — as DebtRows with
// the stitch-arrow glyph. Settlement history at the bottom. No card borders,
// no glow, no text-glyph controls.

import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CaretLeft } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { Screen, StitchLabel, Amount, Row } from '@components'
import { BalanceRow, DebtRow, SettleUpSheet } from '@components/settlement'
import { useSettlements } from '@hooks/useSettlements'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import { feedTimestamp } from '@lib/utils/date'
import type { DebtSimplified } from '@lib/engine/balanceEngine'
import type { HomeStackScreenProps } from '@navigation/types'
import type { Timestamp } from 'firebase/firestore'

type Props = HomeStackScreenProps<'BalanceSummary'>

export function BalanceSummaryScreen({ route }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, layout } = useTheme()
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
      {/* Header — transparent, back tile (§3.12) */}
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing.lg, marginBottom: spacing.lg }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.backTile, { backgroundColor: colors.bgTertiary }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <CaretLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Balances</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* My net hero (Law 2 focal point) */}
        {myBalance && (
          <View style={{ marginBottom: spacing.lg }}>
            {myBalance.isSettled ? (
              <Text style={[text.display.sm, { color: colors.settled }]}>All settled</Text>
            ) : (
              <>
                <Text style={[text.heading.md, { color: colors.textSecondary }]}>
                  {myBalance.isPayer ? "You're owed" : 'You owe'}
                </Text>
                <Amount
                  value={Math.abs(myBalance.netPaise) / 100}
                  size="lg"
                  animate
                  color={myBalance.isPayer ? colors.positive : colors.negative}
                />
              </>
            )}
          </View>
        )}

        {/* Owed to you (leaf) */}
        {owedToMe.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <StitchLabel label="Owed to you" />
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

        {/* You owe (madder) */}
        {myDebts.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <StitchLabel label="You owe" />
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

        {/* All balances */}
        <StitchLabel label="All balances" />
        <View style={{ marginBottom: spacing.lg }}>
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
        <Row
          dense
          title="Total group spend"
          titleNode={<Text style={[text.body.sm, { color: colors.textSecondary }]}>Total group spend</Text>}
          trailing={<Amount value={summary.totalExpensesRupees} size="md" />}
        />

        {/* Settlement history */}
        {settlements.length > 0 && (
          <>
            <StitchLabel label="Settlement history" />
            {settlements.slice(0, 10).map(s => {
              const from = members.get(s.fromUid)
              const to = members.get(s.toUid)
              const ts = s.createdAt as unknown as Timestamp
              const fromLabel = s.fromUid === myUid ? 'You' : from?.name.split(' ')[0] ?? '?'
              const toLabel = s.toUid === myUid ? 'you' : to?.name.split(' ')[0] ?? '?'
              return (
                <Row
                  key={s.id}
                  dense
                  title={`${fromLabel} paid ${toLabel}`}
                  subtitle={ts?.toDate ? feedTimestamp(ts.toDate()) : undefined}
                  trailing={<Amount value={s.amountRupees} size="sm" />}
                />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
