// src/components/settlement/DebtRow.tsx
// Kora & Ink debt row — Blueprint §4.6.1. A Row: payer avatar, stitch-arrow
// glyph toward the payee, trailing signed Amount (leaf = owed to you, madder =
// you owe). No card border, no shadow, no "Tap to settle" chrome — a tappable
// row settles. My debts (fromUid === me) open the ceremony sheet.

import { memo, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Row } from '@components/ui/Row'
import { Avatar } from '@components/ui/Avatar'
import { Amount } from '@components/ui/Amount'
import { StitchArrow } from '@components/icons'
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
  const { colors, text } = useTheme()

  const isMyDebt = debt.fromUid === myUid
  const isOwedToMe = debt.toUid === myUid
  const isTappable = isMyDebt && !!onSettle

  const handlePress = useCallback(() => {
    onSettle?.(debt)
  }, [debt, onSettle])

  if (!fromUser || !toUser) return null

  // Sign carries direction: owed-to-me = positive (leaf), I-owe = negative (madder).
  const signedValue = isOwedToMe ? debt.amountRupees : -debt.amountRupees
  const fromLabel = isMyDebt ? 'You' : fromUser.name.split(' ')[0]
  const toLabel = isOwedToMe ? 'you' : toUser.name.split(' ')[0]

  return (
    <Row
      onPress={isTappable ? handlePress : undefined}
      title={`${fromLabel} owes ${toLabel}`}
      leading={
        <View style={styles.pair}>
          <Avatar name={fromUser.name} color={fromUser.avatarColor} imageUrl={fromUser.photoUrl} size="xs" />
          <View style={{ marginHorizontal: 4 }}>
            <StitchArrow size={16} color={colors.stitch} />
          </View>
          <Avatar name={toUser.name} color={toUser.avatarColor} imageUrl={toUser.photoUrl} size="xs" />
        </View>
      }
      subtitleNode={
        isMyDebt ? (
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>Tap to settle</Text>
        ) : undefined
      }
      subtitle={isMyDebt ? ' ' : undefined}
      trailing={<Amount value={signedValue} size="md" signed />}
    />
  )
})

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
