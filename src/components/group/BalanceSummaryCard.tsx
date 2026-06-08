// src/components/group/BalanceSummaryCard.tsx
// The financial heartbeat card. Shows:
//   - Your net balance (positive = owed to you, negative = you owe)
//   - Per-person breakdown (collapsed to top 2, expandable)
//   - "Settle up" CTA
//
// All balance math uses values from the settlement engine (Prompt 0.1).
// This component only displays — never calculates.

import { memo, useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { SettlementBalance, UserInput } from '@lib/schemas'
import { formatINR } from '@lib/utils/currency'

interface BalanceRow {
  uid:      string
  name:     string
  amount:   number   // + = they owe you, − = you owe them
  photoURL?: string
  avatarColor?: string
}

interface Props {
  myUid:      string
  balances:   SettlementBalance[]  // From settlement engine
  members:    Map<string, UserInput>
  onSettle:   (withUid: string) => void
}

export const BalanceSummaryCard = memo(function BalanceSummaryCard({
  myUid,
  balances,
  members,
  onSettle,
}: Props) {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const [expanded, setExpanded] = useState(false)

  // Build per-person rows for current user
  const myRows: BalanceRow[] = balances
    .filter((b) => b.fromUid === myUid || b.toUid === myUid)
    .map((b) => {
      const otherUid  = b.fromUid === myUid ? b.toUid : b.fromUid
      const otherUser = members.get(otherUid)
      const amount    = b.fromUid === myUid ? -b.amount : b.amount  // negative = I owe
      return {
        uid:         otherUid,
        name:        otherUser?.name ?? 'Member',
        amount,
        photoURL:    otherUser?.photoUrl,
        avatarColor: otherUser?.avatarColor,
      }
    })
    .filter((r) => Math.abs(r.amount) >= 1)    // Ignore dust (< ₹1)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))  // Largest first

  // Net balance
  const netBalance = myRows.reduce((sum, r) => sum + r.amount, 0)
  const isOwed     = netBalance > 0
  const isSettled  = Math.abs(netBalance) < 1

  const visibleRows = expanded ? myRows : myRows.slice(0, 2)
  const hasMore     = myRows.length > 2

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpanded((prev) => !prev)
  }, [])

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.xl,
          borderColor:     isSettled
            ? colors.border
            : isOwed
            ? `${colors.positive}30`
            : `${colors.negative}30`,
          borderWidth:  1,
          padding:      spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.card,
        },
      ]}
    >
      {/* Net balance header */}
      <View style={[styles.header, { marginBottom: spacing.md }]}>
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary }]}>
            Your balance
          </Text>
          {isSettled ? (
            <Text style={[text.heading.md, { color: colors.settled ?? colors.positive }]}>
              All settled ✓
            </Text>
          ) : (
            <Text
              style={[
                text.mono.lg,
                {
                  color:      isOwed ? colors.positive : colors.negative,
                  marginTop:  2,
                },
              ]}
            >
              {isOwed ? '+' : '−'}{formatINR(Math.abs(netBalance))}
            </Text>
          )}
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
            {isSettled
              ? 'No pending dues'
              : isOwed
              ? 'you are owed'
              : 'you owe'}
          </Text>
        </View>

        {/* Settle up CTA — show only if user owes someone */}
        {!isSettled && !isOwed && myRows.length > 0 && (
          <Pressable
            onPress={() => onSettle(myRows[0].uid)}
            style={[
              styles.settleBtn,
              {
                backgroundColor: colors.accentPrimary,
                borderRadius:    radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical:   spacing.sm,
                minHeight:         44,
                justifyContent:    'center',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Settle up with ${myRows[0]?.name}`}
          >
            <Text style={[text.label.lg, { color: colors.bgPrimary }]}>
              Settle up
            </Text>
          </Pressable>
        )}
      </View>

      {/* Per-person rows */}
      {myRows.length > 0 && (
        <>
          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border, marginBottom: spacing.md },
            ]}
          />

          {visibleRows.map((row) => (
            <View
              key={row.uid}
              style={[styles.balanceRow, { marginBottom: spacing.sm }]}
            >
              <Avatar
                name={row.name}
                imageUrl={row.photoURL}
                color={row.avatarColor ?? '#4ECDC4'}
                size="sm"
              />
              <Text
                style={[
                  text.body.sm,
                  { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm },
                ]}
                numberOfLines={1}
              >
                {row.name.split(' ')[0]}
              </Text>
              <Text
                style={[
                  text.mono.sm,
                  {
                    color: row.amount > 0 ? colors.positive : colors.negative,
                  },
                ]}
              >
                {row.amount > 0 ? '+' : '−'}{formatINR(Math.abs(row.amount))}
              </Text>
              {row.amount < 0 && (
                <Pressable
                  onPress={() => onSettle(row.uid)}
                  style={[
                    styles.payBtn,
                    {
                      backgroundColor: colors.bgTertiary,
                      borderRadius:    radius.sm,
                      borderColor:     colors.border,
                      borderWidth:     1,
                      paddingHorizontal: spacing.sm,
                      paddingVertical:   4,
                      marginLeft:        spacing.sm,
                      minHeight:         28,
                      justifyContent:    'center',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay ${row.name}`}
                >
                  <Text style={[text.label.sm, { color: colors.textSecondary }]}>
                    Pay
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Show more / less */}
          {hasMore && (
            <Pressable
              onPress={handleToggle}
              style={{ alignItems: 'center', paddingTop: spacing.xs }}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Show less' : `Show ${myRows.length - 2} more`}
            >
              <Text
                style={[text.label.md, { color: colors.accentPrimary }]}
              >
                {expanded
                  ? 'Show less ↑'
                  : `${myRows.length - 2} more ↓`}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  card:       {},
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  settleBtn:  {},
  divider:    { height: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  payBtn:     {},
})
