// src/components/settlement/SettlementAmountRow.tsx
// A single row showing who you owe (or who owes you) and the amount.
// Primary CTA: "Pay" — opens SettlementConfirmSheet.
// Rows where I am owed show the amount in green with no action button.

import { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme }  from '@theme'
import { Avatar }    from '@components/ui/Avatar'
import { formatINR } from '@lib/utils/currency'

interface Props {
  // The OTHER person in this balance row
  uid:         string
  name:        string
  avatarColor: string
  photoURL?:   string

  // Signed amount — negative = I owe them, positive = they owe me
  amount:  number

  onSettle: (uid: string) => void
  onPress?: (uid: string) => void
}

export const SettlementAmountRow = memo(function SettlementAmountRow({
  uid,
  name,
  avatarColor,
  photoURL,
  amount,
  onSettle,
  onPress,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()

  const iOweThem  = amount < 0
  const absAmount = Math.abs(amount)
  const displayName = name.split(' ')[0]!  // First name only

  const handleSettle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSettle(uid)
  }, [uid, onSettle])

  const handlePress = useCallback(() => {
    onPress?.(uid)
  }, [uid, onPress])

  // Filter out dust (< ₹1)
  if (absAmount < 1) return null

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.lg,
          borderColor:     iOweThem ? colors.accentDanger + '40' : colors.border,
          borderWidth:     iOweThem ? 1.5 : 1,
          padding:         spacing.md,
          marginBottom:    spacing.sm,
          opacity:         pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={
        iOweThem
          ? `You owe ${displayName} ${formatINR(absAmount)}`
          : `${displayName} owes you ${formatINR(absAmount)}`
      }
    >
      <View style={styles.left}>
        <Avatar
          name={name}
          color={avatarColor}
          imageUrl={photoURL}
          size="md"
        />
        <View style={[styles.nameBlock, { marginLeft: spacing.md }]}>
          <Text
            style={[text.body.md, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
            {iOweThem ? 'You owe' : 'Owes you'}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {/* Amount */}
        <Text
          style={[
            text.mono.md,
            {
              color:       iOweThem ? colors.negative : colors.positive,
              marginRight: iOweThem ? spacing.sm : 0,
              fontVariant: ['tabular-nums'],
            },
          ]}
        >
          {formatINR(absAmount)}
        </Text>

        {/* Settle CTA — only shown when current user owes */}
        {iOweThem && (
          <Pressable
            onPress={handleSettle}
            style={[
              styles.settleBtn,
              {
                backgroundColor:   colors.accentPrimary,
                borderRadius:      radius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical:   spacing.xs,
                minHeight:         36,
                justifyContent:    'center',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Settle up with ${displayName}`}
          >
            <Text style={[text.label.lg, { color: colors.bgPrimary }]}>
              Pay
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nameBlock: { flex: 1 },
  right:     { flexDirection: 'row', alignItems: 'center' },
  settleBtn: {},
})
