// src/components/settlement/BalanceSummaryCard.tsx
// Hero card shown at top of BalanceSummaryScreen.
// Green teal if you are owed. Red coral if you owe. Muted if settled.
// Works with both the legacy MemberBalance type and the new MemberBalanceSummary type.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme }               from '@theme'
import { formatINR }              from '@lib/utils/currency'

// Accept either the existing MemberBalance or new MemberBalanceSummary shape
interface BalanceSummaryCardProps {
  netPaise:   number   // Positive = owed to me; Negative = I owe
  isCreditor: boolean
  isDebtor:   boolean
  isSettled:  boolean
  userName:   string
}

export function BalanceSummaryCard({
  netPaise,
  isCreditor,
  isDebtor,
  isSettled,
  userName,
}: BalanceSummaryCardProps) {
  const { colors, text, spacing, radius, shadows } = useTheme()

  const absAmount = Math.abs(netPaise / 100)

  const accentColor = isCreditor
    ? colors.accentPrimary    // Teal — you are owed
    : isDebtor
      ? colors.accentDanger   // Coral — you owe
      : colors.settled        // Muted — settled

  const headline = isSettled
    ? `You're all settled up!`
    : isCreditor
      ? `You are owed`
      : `You owe`

  const subline = isSettled
    ? `${userName}, no pending balances in this group.`
    : isCreditor
      ? `Others owe you a total of ${formatINR(absAmount)}`
      : `Your total share to settle: ${formatINR(absAmount)}`

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.xl,
          borderColor:     `${accentColor}30`,
          borderWidth:     1,
          padding:         spacing.xl,
          marginBottom:    spacing.xl,
          ...(isSettled ? shadows.card : isCreditor ? shadows.accentGlow : shadows.card),
        },
      ]}
      accessible
      accessibilityLabel={`${headline} ${isSettled ? '' : formatINR(absAmount)}`}
    >
      <Text style={[text.label.md, { color: accentColor, marginBottom: spacing.xs }]}>
        {headline}
      </Text>

      {!isSettled && (
        <Text
          style={[
            text.mono.lg,
            { color: accentColor, marginBottom: spacing.sm, fontVariant: ['tabular-nums'] },
          ]}
        >
          {formatINR(absAmount)}
        </Text>
      )}

      {isSettled && (
        <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>🎉</Text>
      )}

      <Text style={[text.body.sm, { color: colors.textSecondary }]}>
        {subline}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {},
})
