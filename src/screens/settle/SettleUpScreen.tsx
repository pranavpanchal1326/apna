// src/screens/settle/SettleUpScreen.tsx
// The full "Settle Up" flow screen.
// Reached from:
//   - BalanceSummaryCard "Settle up" CTA (pre-selects withUid)
//   - MembersTab "Pay" button (pre-selects that member)
//   - DebtRow "Tap to settle" (via BalanceSummaryScreen → SettleUp)
//
// Shows all outstanding per-person balances for the current user.
// User taps a row → SettlementConfirmSheet opens → confirms → recorded in Firestore.
// After success → navigates back (balance card refreshes via real-time subscription).

import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme }              from '@theme'
import { Screen }                from '@components'
import { SettlementAmountRow, SettlementConfirmSheet } from '@components/settlement'
import type { SettlementMethod } from '@components/settlement'
import { useGroupMembers }       from '@hooks/useGroupMembers'
import { useAuth }               from '@hooks/useAuth'
import { recordSettlement }      from '@lib/firebase/settlements'
import { captureError }          from '@lib/sentry'
import { track }                 from '@lib/analytics'
import type { HomeStackScreenProps } from '@navigation/types'
import { useNavigation } from '@react-navigation/native'
import { Pressable } from 'react-native'

type Props = HomeStackScreenProps<'SettleUp'>

export function SettleUpScreen({ route }: Props) {
  const { groupId, withUid: preSelectedUid, balances } = route.params
  const { colors, text, spacing } = useTheme()
  const { user }    = useAuth()
  const navigation  = useNavigation()
  const myUid       = user?.uid ?? ''

  // Fetch member profiles for display
  const allUids = useMemo(
    () => [...new Set(balances.flatMap((b) => [b.fromUid, b.toUid]))],
    [balances]
  )
  const { members } = useGroupMembers(allUids)

  // Build per-person balance rows for current user
  // Positive amount = they owe me, negative = I owe them
  const myBalanceRows = useMemo(() => {
    return balances
      .filter((b) => b.fromUid === myUid || b.toUid === myUid)
      .map((b) => {
        const otherUid = b.fromUid === myUid ? b.toUid   : b.fromUid
        const amount   = b.fromUid === myUid ? -b.amount : b.amount   // Negative = I owe
        return { uid: otherUid, amount }
      })
      .filter((r) => Math.abs(r.amount) >= 1)                         // Filter dust
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))        // Largest first
  }, [balances, myUid])

  // Sheet state
  const [selectedUid,  setSelectedUid]  = useState<string | null>(
    preSelectedUid ?? null
  )
  const [sheetVisible, setSheetVisible] = useState<boolean>(
    Boolean(preSelectedUid)   // Auto-open if launched with a pre-selected person
  )
  const [isRecording,  setIsRecording]  = useState(false)

  const selectedRow    = myBalanceRows.find((r) => r.uid === selectedUid)
  const selectedMember = selectedUid ? members.get(selectedUid) : undefined

  const handleOpenSettle = useCallback((uid: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedUid(uid)
    setSheetVisible(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false)
    setSelectedUid(null)
  }, [])

  const handleConfirmSettlement = useCallback(
    async (amount: number, method: SettlementMethod, note?: string) => {
      if (!selectedUid || !myUid || amount <= 0) return

      setIsRecording(true)
      try {
        await recordSettlement({
          groupId,
          fromUid: myUid,        // Current user is always the payer
          toUid:   selectedUid,
          amountRupees: amount,
          currency:     'INR',
          note,
        })

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        track('settlement_recorded', { method, groupId })

        setSheetVisible(false)
        setSelectedUid(null)

        // Pop screen after success — balance card refreshes via real-time subscription
        navigation.goBack()
      } catch (err) {
        captureError(err, { source: 'SettleUpScreen.handleConfirmSettlement', groupId })
        Alert.alert(
          'Could not record settlement',
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        )
      } finally {
        setIsRecording(false)
      }
    },
    [selectedUid, myUid, groupId, navigation]
  )

  const allSettled = myBalanceRows.length === 0

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: colors.accentPrimary, fontSize: 24, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Settle up</Text>
        <View style={{ width: 50 }} />
      </View>

      {allSettled ? (
        // All settled empty state
        <View style={styles.settled}>
          <Text style={{ fontSize: 56, marginBottom: spacing.md }}>🎉</Text>
          <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            All settled!
          </Text>
          <Text
            style={[
              text.body.md,
              { color: colors.textSecondary, textAlign: 'center', maxWidth: 240 },
            ]}
          >
            No pending dues in this group.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myBalanceRows}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const member = members.get(item.uid)
            if (!member) return null
            return (
              <SettlementAmountRow
                uid={item.uid}
                name={member.name}
                avatarColor={member.avatarColor}
                photoURL={member.photoUrl}
                amount={item.amount}
                onSettle={handleOpenSettle}
              />
            )
          }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop:        spacing.md,
            paddingBottom:     120,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text
              style={[
                text.label.md,
                {
                  color:         colors.textSecondary,
                  marginBottom:  spacing.md,
                  letterSpacing: 1,
                },
              ]}
            >
              YOUR BALANCES
            </Text>
          }
        />
      )}

      {/* Settlement confirmation bottom sheet */}
      {selectedMember && selectedRow && (
        <SettlementConfirmSheet
          visible={sheetVisible}
          onClose={handleCloseSheet}
          toName={selectedMember.name}
          toColor={selectedMember.avatarColor}
          toPhotoURL={selectedMember.photoUrl}
          amount={Math.abs(selectedRow.amount)}
          onConfirm={handleConfirmSettlement}
          isLoading={isRecording}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settled: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 32,
  },
})
