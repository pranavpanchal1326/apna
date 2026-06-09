// src/components/ui/SettlementCard.tsx
// "Priya pays Arjun ₹840" — the core settlement UI unit.
// Tappable to open SettleUpScreen confirmation.

import { useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from './Avatar'
import { formatAmount } from '@lib/utils/date'
import type { SettlementItem } from '@lib/firebase/settlements'

interface SettlementCardProps {
  settlement:   SettlementItem
  currentUid:   string
  onPress:      (settlement: SettlementItem) => void
  isRecorded?:  boolean
}

export function SettlementCard({
  settlement,
  currentUid,
  onPress,
  isRecorded = false,
}: SettlementCardProps) {
  const { colors, spacing, radius, text, shadows } = useTheme()

  const isMyPayment = settlement.fromUid === currentUid
  const amountStr   = formatAmount(settlement.amountPaise / 100)

  const handlePress = useCallback(() => {
    if (isRecorded) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(settlement)
  }, [settlement, isRecorded])

  return (
    <Pressable
      onPress={handlePress}
      disabled={isRecorded}
      accessibilityRole="button"
      accessibilityLabel={`${settlement.fromName} pays ${settlement.toName} ${amountStr}${isRecorded ? ', settled' : ''}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isRecorded ? colors.bgSecondary : colors.bgTertiary,
          borderRadius:    radius.lg,
          padding:         spacing.lg,
          marginBottom:    spacing.sm,
          borderWidth:     1,
          borderColor:     isRecorded
            ? colors.border
            : isMyPayment
            ? `${colors.accentDanger}66`
            : settlement.toUid === currentUid
            ? `${colors.accentPrimary}66`
            : colors.borderAccent,
          opacity: pressed ? 0.85 : 1,
          ...shadows.card,
        },
      ]}
    >
      <View style={styles.row}>
        {/* FROM avatar */}
        <Avatar
          name={settlement.fromName}
          color={isRecorded ? colors.settled : colors.accentDanger}
          size="md"
        />

        {/* Arrow + amount */}
        <View style={styles.middle}>
          <Text
            style={[
              text.mono.md,
              {
                color:    isRecorded ? colors.settled : isMyPayment ? colors.accentDanger : colors.textPrimary,
                fontSize: 17,
              },
            ]}
          >
            {amountStr}
          </Text>
          <Text style={[text.label.sm, { color: colors.textMuted }]}>
            {isMyPayment ? 'you pay' : 'pays'}
          </Text>
        </View>

        {/* TO avatar */}
        <Avatar
          name={settlement.toName}
          color={isRecorded ? colors.settled : colors.accentPrimary}
          size="md"
        />
      </View>

      {/* Names row */}
      <View style={[styles.namesRow, { marginTop: spacing.xs }]}>
        <Text style={[text.label.md, { color: isRecorded ? colors.settled : colors.textSecondary, flex: 1 }]}>
          {settlement.fromName}
        </Text>
        <Text style={[text.label.sm, { color: colors.textMuted }]}>→</Text>
        <Text style={[text.label.md, { color: isRecorded ? colors.settled : colors.textSecondary, flex: 1, textAlign: 'right' }]}>
          {settlement.toName}
        </Text>
      </View>

      {/* Recorded badge */}
      {isRecorded && (
        <View style={[styles.recordedBadge, { marginTop: spacing.xs }]}>
          <Text style={[text.label.sm, { color: colors.settled }]}>✓ Settled</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card:       {},
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  middle:     { alignItems: 'center', flex: 1 },
  namesRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordedBadge: { alignItems: 'center' },
})
