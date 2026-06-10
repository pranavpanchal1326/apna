// src/screens/itinerary/ProposalVoteChips.tsx
// Yes / Maybe / No voting chips for proposed itinerary items.
// Shows compact controls: "Going" | "Maybe" | "Not going".
// Tapping triggers a vote write (handled by useActivityVoting).
//
// HAPTICS: light tap on vote (ReactNativeHapticFeedback.trigger('impactLight'))

import { Pressable, StyleSheet, Text, View } from 'react-native'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useTheme } from '../../theme'
import type { VoteValue } from '../../lib/types'

interface ProposalVoteChipsProps {
  myVote: VoteValue | null
  onVote: (vote: VoteValue) => void
  disabled?: boolean
}

export function ProposalVoteChips({ myVote, onVote, disabled }: ProposalVoteChipsProps) {
  const { colors, text, spacing, radius } = useTheme()

  function handleVote(vote: VoteValue) {
    if (disabled) return
    ReactNativeHapticFeedback.trigger('impactLight')
    onVote(vote)
  }

  const options: Array<{ vote: VoteValue; label: string; emoji: string; activeColor: string }> = [
    { vote: 'yes',   label: 'Going',     emoji: '👍', activeColor: colors.accentPrimary },
    { vote: 'maybe', label: 'Maybe',     emoji: '💬', activeColor: colors.accentGold },
    { vote: 'no',    label: 'Not going', emoji: '👎', activeColor: colors.accentDanger },
  ]

  return (
    <View style={styles.row}>
      {options.map(({ vote, label, emoji, activeColor }) => {
        const isActive = myVote === vote
        return (
          <Pressable
            key={vote}
            onPress={() => handleVote(vote)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive
                  ? `${activeColor}18`
                  : colors.bgTertiary,
                borderColor: isActive ? activeColor : colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm - 2,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={`${label} option`}
          >
            <Text
              style={[
                text.label.sm,
                {
                  color: isActive ? activeColor : colors.textSecondary,
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
            >
              {emoji} {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
