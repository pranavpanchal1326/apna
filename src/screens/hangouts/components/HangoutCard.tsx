// src/screens/hangouts/components/HangoutCard.tsx
// Compact card shown in the group list view.
// Shows: title, time, place, status badge, RSVP counts, and your vote.

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../../theme'
import type { Hangout } from '../../../lib/schemas/hangout.schema'
import { formatHangoutTime, hangoutDisplayState, myRsvp, yesVotesNeeded } from '../../../lib/utils/hangout'

interface Props {
  hangout:  Hangout
  myUid:    string
  onPress:  () => void
}

const RSVP_EMOJI: Record<string, string> = {
  yes:   '✓',
  maybe: '?',
  no:    '✕',
}

export function HangoutCard({ hangout, myUid, onPress }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const displayState  = hangoutDisplayState(hangout)
  const myVote        = myRsvp(hangout, myUid)
  const votesNeeded   = yesVotesNeeded(hangout)
  const timeLabel     = formatHangoutTime(hangout)
  const isConfirmed   = displayState === 'confirmed'
  const isCanceled    = displayState === 'canceled'
  const isPast        = displayState === 'past'
  const isActive      = !isCanceled && !isPast

  // Status badge colors
  const badgeColor = isConfirmed ? colors.positive
    : isCanceled ? colors.accentDanger
    : isPast     ? colors.textMuted
    : colors.accentGold

  const badgeLabel = isConfirmed ? '✓ Confirmed'
    : isCanceled   ? '✕ Canceled'
    : isPast       ? 'Past'
    : votesNeeded > 0 ? `${votesNeeded} more yes`
    : 'Proposed'

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.lg,
          borderColor:     isConfirmed ? colors.positive + '44' : colors.border,
          borderWidth:     isConfirmed ? 1.5 : 1,
          padding:         spacing.lg,
          marginHorizontal: spacing.md,
          marginBottom:    spacing.sm,
          opacity:         isPast || isCanceled ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${hangout.title}, ${timeLabel}`}
    >
      {/* Top row: title + status badge */}
      <View style={styles.topRow}>
        <Text
          style={[text.body.lg, { color: colors.textPrimary, fontFamily: 'Outfit-SemiBold', flex: 1 }]}
          numberOfLines={1}
        >
          {isConfirmed ? '🎉 ' : ''}{hangout.title}
        </Text>
        <View style={[
          styles.badge,
          {
            backgroundColor: badgeColor + '22',
            borderColor:     badgeColor + '55',
            borderRadius:    radius.full,
            borderWidth:     1,
          },
        ]}>
          <Text style={[text.label.sm, { color: badgeColor, fontFamily: 'Outfit-Medium' }]}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      {/* Time + place */}
      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4 }]}>
        📅 {timeLabel}
        {hangout.placeName ? `  📍 ${hangout.placeName}` : ''}
        {hangout.budgetEstimate ? `  ₹${hangout.budgetEstimate}/head` : ''}
      </Text>

      {/* RSVP counts */}
      <View style={[styles.rsvpRow, { marginTop: spacing.sm }]}>
        <View style={styles.rsvpCount}>
          <Text style={[text.label.md, { color: colors.positive, fontFamily: 'Outfit-SemiBold' }]}>
            ✓ {hangout.yesCount}
          </Text>
        </View>
        <View style={styles.rsvpCount}>
          <Text style={[text.label.md, { color: colors.accentGold, fontFamily: 'Outfit-SemiBold' }]}>
            ? {hangout.maybeCount}
          </Text>
        </View>
        <View style={styles.rsvpCount}>
          <Text style={[text.label.md, { color: colors.accentDanger, fontFamily: 'Outfit-SemiBold' }]}>
            ✕ {hangout.noCount}
          </Text>
        </View>

        {/* My vote indicator */}
        {myVote && (
          <View style={[styles.myVotePill, {
            backgroundColor: colors.bgTertiary,
            borderRadius:    radius.full,
            borderColor:     colors.border,
            borderWidth:     1,
            marginLeft:      'auto',
          }]}>
            <Text style={[text.label.sm, { color: colors.textMuted }]}>
              You: {RSVP_EMOJI[myVote]} {myVote}
            </Text>
          </View>
        )}

        {!myVote && isActive && (
          <View style={[styles.myVotePill, {
            backgroundColor: colors.accentPrimary + '15',
            borderRadius:    radius.full,
            borderColor:     colors.accentPrimary + '44',
            borderWidth:     1,
            marginLeft:      'auto',
          }]}>
            <Text style={[text.label.sm, { color: colors.accentPrimary }]}>Tap to vote →</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card:     {},
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:    { paddingHorizontal: 8, paddingVertical: 3 },
  rsvpRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rsvpCount: {},
  myVotePill: { paddingHorizontal: 10, paddingVertical: 4 },
})
