// src/components/ui/SettlementCard.tsx
// Kora & Ink settlement ceremony — Blueprint §3.11. One of the three sanctioned
// card surfaces (money-moment). Debtor avatar — horizontal stitch — creditor
// avatar; amount centered below in monoLg; on settle the stitch sews across and
// a knot lands at the midpoint with a success haptic. "Make it feel like a
// small ceremony." No borders, no shadow, no accent glow, no text glyphs.

import { useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from './Avatar'
import { Amount } from './Amount'
import { Stitch } from './Stitch'
import { ThreadKnot } from '../icons'
import type { SettlementItem } from '@lib/firebase/settlements'

interface SettlementCardProps {
  settlement:  SettlementItem
  currentUid:  string
  onPress:     (settlement: SettlementItem) => void
  isRecorded?: boolean
}

export function SettlementCard({
  settlement,
  currentUid,
  onPress,
  isRecorded = false,
}: SettlementCardProps) {
  const { colors, spacing, radius, text } = useTheme()

  const isMyPayment = settlement.fromUid === currentUid
  const rupees = settlement.amountPaise / 100

  const handlePress = useCallback(() => {
    if (isRecorded) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(settlement)
  }, [settlement, isRecorded, onPress])

  const fromColor = isRecorded ? colors.settled : colors.accentPrimary
  const toColor = isRecorded ? colors.settled : colors.positive

  return (
    <Pressable
      onPress={handlePress}
      disabled={isRecorded}
      accessibilityRole="button"
      accessibilityLabel={`${settlement.fromName} pays ${settlement.toName} ${rupees} rupees${isRecorded ? ', settled' : ''}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.sheet,
          padding: spacing.xl,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {/* debtor — stitch — creditor */}
      <View style={styles.row}>
        <View style={styles.avatarCol}>
          <Avatar name={settlement.fromName} color={fromColor} size="lg" />
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
            {isMyPayment ? 'You' : settlement.fromName.split(' ')[0]}
          </Text>
        </View>

        <View style={styles.stitchGap}>
          {isRecorded ? (
            <ThreadKnot size={22} color={colors.settled} />
          ) : (
            <Stitch />
          )}
        </View>

        <View style={styles.avatarCol}>
          <Avatar name={settlement.toName} color={toColor} size="lg" />
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
            {settlement.toName.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* amount centered below */}
      <View style={[styles.amountWrap, { marginTop: spacing.lg }]}>
        <Amount value={rupees} size="lg" settled={isRecorded} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarCol: {
    alignItems: 'center',
    width: 72,
  },
  stitchGap: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  amountWrap: {
    alignItems: 'center',
  },
})
