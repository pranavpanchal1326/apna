// src/components/settlement/BalanceRow.tsx
// Single member balance row — shows name, avatar, and net balance.
// Positive (owed to them): teal. Negative (they owe): coral. Zero: muted.

import { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import { formatBalanceHero } from '@lib/engine/balanceEngine'
import type { MemberBalance } from '@lib/engine/balanceEngine'
import type { UserInput } from '@lib/schemas'

interface Props {
  balance: MemberBalance
  user: UserInput | undefined
  isMe?: boolean
}

export const BalanceRow = memo(function BalanceRow({ balance, user, isMe }: Props) {
  const { colors, text, spacing } = useTheme()

  if (!user) return null

  const balanceColor = balance.isSettled
    ? colors.settled
    : balance.isPayer
      ? colors.positive
      : colors.negative

  const label = balance.isSettled
    ? 'All settled'
    : balance.isPayer
      ? `gets back ₹${Math.abs(balance.netPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `owes ₹${Math.abs(balance.netPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <Avatar
        name={user.name}
        color={user.avatarColor}
        imageUrl={user.photoUrl}
        size="md"
      />
      <View style={[styles.info, { marginLeft: spacing.sm }]}>
        <Text style={[text.body.md, { color: colors.textPrimary }]} numberOfLines={1}>
          {isMe ? 'You' : user.name.split(' ')[0]}
        </Text>
        <Text style={[text.label.sm, { color: balanceColor, marginTop: 2 }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          text.mono.md,
          {
            color: balanceColor,
            fontVariant: ['tabular-nums'],
          },
        ]}
      >
        {balance.isSettled ? '✓' : formatBalanceHero(balance.netPaise)}
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
})
