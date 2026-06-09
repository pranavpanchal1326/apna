// src/screens/itinerary/ItemTimeSlotBadge.tsx
// Small time badge rendered above an item card when timeSlot is present.
// Example: "09:30 – 11:00"
// Typography: Text.mono.sm (JetBrains Mono — time is numeric data)

import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import type { TimeSlot } from '../../lib/schemas'

interface ItemTimeSlotBadgeProps {
  timeSlot: TimeSlot
}

export function ItemTimeSlotBadge({ timeSlot }: ItemTimeSlotBadgeProps) {
  const { colors, text, spacing, radius } = useTheme()

  const label = timeSlot.endTime
    ? `${timeSlot.startTime} – ${timeSlot.endTime}`
    : timeSlot.startTime

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bgTertiary,
          borderColor:     colors.border,
          borderRadius:    radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical:   spacing.xs - 2,  // 2dp vertical
          marginBottom:    spacing.xs,
          alignSelf:       'flex-start',
          marginLeft:      spacing.xl + 32 + spacing.md,  // Align with item text
        },
      ]}
    >
      <Text style={[text.mono.sm, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
