// src/screens/itinerary/VoteChips.tsx
// 👍/👎 voting chips for tentative itinerary items.
// Shows vote counts. Tapping toggles the user's vote (handled by store.vote).
// Only visible when item.isConfirmed === false.
//
// HAPTICS: light tap on vote (HapticPattern.light)

import { Pressable, StyleSheet, Text, View } from 'react-native'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useTheme } from '../../theme'

interface VoteChipsProps {
  votes:     { up: string[]; down: string[] }
  myUid:     string
  onVote:    (vote: 'up' | 'down') => void
  disabled?: boolean
}

export function VoteChips({ votes, myUid, onVote, disabled }: VoteChipsProps) {
  const { colors, text, spacing, radius } = useTheme()

  const myVote = votes.up.includes(myUid)
    ? 'up'
    : votes.down.includes(myUid)
      ? 'down'
      : null

  function handleVote(vote: 'up' | 'down') {
    if (disabled) return
    ReactNativeHapticFeedback.trigger('impactLight')
    onVote(vote)
  }

  const chips: Array<{ vote: 'up' | 'down'; emoji: string; count: number }> = [
    { vote: 'up',   emoji: '👍', count: votes.up.length   },
    { vote: 'down', emoji: '👎', count: votes.down.length },
  ]

  return (
    <View style={styles.row}>
      {chips.map(({ vote, emoji, count }) => {
        const isActive = myVote === vote
        return (
          <Pressable
            key={vote}
            onPress={() => handleVote(vote)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive
                  ? vote === 'up' ? `${colors.accentPrimary}20` : `${colors.accentDanger}20`
                  : colors.bgTertiary,
                borderColor: isActive
                  ? vote === 'up' ? colors.accentPrimary : colors.accentDanger
                  : colors.border,
                borderRadius: radius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical:   spacing.xs - 1,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityLabel={`Vote ${vote} — ${count} votes`}
            accessibilityRole="button"
          >
            <Text style={[text.label.md, { color: colors.textSecondary }]}>
              {emoji} {count}
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
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
