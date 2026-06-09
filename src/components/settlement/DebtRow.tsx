// src/components/settlement/DebtRow.tsx
// Single simplified debt: "Riya owes Arjun ₹1,250"
// Tappable — opens SettleUpSheet when tapped (if fromUid === myUid)

import { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { DebtSimplified } from '@lib/engine/balanceEngine'
import type { UserInput } from '@lib/schemas'

interface Props {
  debt: DebtSimplified
  fromUser: UserInput | undefined
  toUser: UserInput | undefined
  myUid: string
  onSettle?: (debt: DebtSimplified) => void
}

export const DebtRow = memo(function DebtRow({
  debt,
  fromUser,
  toUser,
  myUid,
  onSettle,
}: Props) {
  const { colors, text, spacing, radius, shadows } = useTheme()

  const isMyDebt = debt.fromUid === myUid
  const isOwnedToMe = debt.toUid === myUid
  const isTappable = isMyDebt && !!onSettle

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSettle?.(debt)
  }, [debt, onSettle])

  if (!fromUser || !toUser) return null

  const amountStr = debt.amountRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const Inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: isMyDebt ? colors.accentDanger + '40' : colors.border,
          borderWidth: isMyDebt ? 1.5 : 1,
          padding: spacing.md,
          marginBottom: spacing.sm,
          ...shadows.card,
        },
      ]}
    >
      {/* From → To */}
      <View style={styles.row}>
        <Avatar name={fromUser.name} color={fromUser.avatarColor} imageUrl={fromUser.photoUrl} size="sm" />
        <Text style={[text.label.md, { color: colors.textMuted, marginHorizontal: spacing.sm }]}>
          owes
        </Text>
        <Avatar name={toUser.name} color={toUser.avatarColor} imageUrl={toUser.photoUrl} size="sm" />
        <View style={styles.spacer} />
        <Text
          style={[
            text.mono.md,
            {
              color: isMyDebt ? colors.negative : isOwnedToMe ? colors.positive : colors.textPrimary,
              fontVariant: ['tabular-nums'],
            },
          ]}
        >
          ₹{amountStr}
        </Text>
      </View>

      {/* Names + CTA */}
      <View style={[styles.row, { marginTop: spacing.xs }]}>
        <Text style={[text.body.sm, { color: colors.textPrimary, flex: 1 }]}>
          {isMyDebt ? 'You' : fromUser.name.split(' ')[0]}
          {' → '}
          {isOwnedToMe ? 'You' : toUser.name.split(' ')[0]}
        </Text>
        {isMyDebt && (
          <Text style={[text.label.md, { color: colors.accentPrimary }]}>
            Tap to settle
          </Text>
        )}
      </View>
    </View>
  )

  if (!isTappable) return Inner

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Settle ₹${amountStr} with ${toUser.name.split(' ')[0]}`}
    >
      {Inner}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  card: {},
  row:  { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
})
