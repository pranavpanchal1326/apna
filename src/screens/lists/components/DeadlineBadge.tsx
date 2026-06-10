// src/screens/lists/components/DeadlineBadge.tsx
// Calm, readable urgency badge for list item deadlines.
// Derives urgency state from a date string — no Firestore reads.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../theme'
import { getDeadlineUrgency, formatDeadlineLabel } from '../../../lib/utils/listDeadline'

interface Props {
  deadlineDate?: string
}

export function DeadlineBadge({ deadlineDate }: Props) {
  const { colors, text } = useTheme()

  if (!deadlineDate) return null

  const urgency = getDeadlineUrgency(deadlineDate)
  const label   = formatDeadlineLabel(deadlineDate)

  if (urgency === 'none') return null

  const badgeColor: string = urgency === 'overdue'
    ? colors.accentDanger
    : urgency === 'due_soon'
    ? colors.warning
    : colors.accentPrimary

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
      <Text style={[text.label.sm, { color: badgeColor, fontFamily: 'Outfit-Medium' }]}>
        {urgency === 'overdue' ? '⚠ ' : '⏱ '}{label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius:   6,
    borderWidth:    1,
    marginTop:      4,
  },
})
