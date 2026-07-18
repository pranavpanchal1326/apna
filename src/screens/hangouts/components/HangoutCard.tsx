// src/screens/hangouts/components/HangoutCard.tsx
// Compact card shown in the group list view.
// Shows: title, time, place, status badge, RSVP counts, and your vote.

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Check, X, Question, Confetti, CalendarBlank, MapPin, CaretRight } from 'phosphor-react-native'
import type { ComponentType } from 'react'
import type { IconProps } from 'phosphor-react-native'
import { useTheme } from '../../../theme'
import type { Hangout } from '../../../lib/schemas/hangout.schema'
import { formatHangoutTime, hangoutDisplayState, myRsvp, yesVotesNeeded } from '../../../lib/utils/hangout'

interface Props {
  hangout:  Hangout
  myUid:    string
  onPress:  () => void
}

const RSVP_ICON: Record<string, ComponentType<IconProps>> = {
  yes:   Check,
  maybe: Question,
  no:    X,
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
    : isCanceled ? colors.negative
    : isPast     ? colors.textMuted
    : colors.warning

  const badgeLabel = isConfirmed ? 'Confirmed'
    : isCanceled   ? 'Canceled'
    : isPast       ? 'Past'
    : votesNeeded > 0 ? `${votesNeeded} more yes`
    : 'Proposed'
  const MyVoteIcon = myVote ? RSVP_ICON[myVote] : null

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.lg,
          borderColor:     isConfirmed ? colors.positive + '44' : colors.hairline,
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
        <View style={styles.titleRow}>
          {isConfirmed && <Confetti size={16} color={colors.positive} />}
          <Text
            style={[text.body.lg, { color: colors.textPrimary, fontFamily: 'Outfit-SemiBold', flex: 1 }]}
            numberOfLines={1}
          >
            {hangout.title}
          </Text>
        </View>
        <View style={[
          styles.badge,
          {
            backgroundColor: badgeColor + '22',
            borderColor:     badgeColor + '55',
            borderRadius:    radius.full,
            borderWidth:     1,
          },
        ]}>
          {isConfirmed && <Check size={12} color={badgeColor} weight="bold" />}
          {isCanceled && <X size={12} color={badgeColor} weight="bold" />}
          <Text style={[text.label.sm, { color: badgeColor, fontFamily: 'Outfit-Medium' }]}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      {/* Time + place */}
      <View style={styles.metaRow}>
        <CalendarBlank size={13} color={colors.textSecondary} />
        <Text style={[text.body.sm, { color: colors.textSecondary }]}>{timeLabel}</Text>
        {hangout.placeName ? (
          <>
            <MapPin size={13} color={colors.textSecondary} style={{ marginLeft: 6 }} />
            <Text style={[text.body.sm, { color: colors.textSecondary }]} numberOfLines={1}>
              {hangout.placeName}
            </Text>
          </>
        ) : null}
        {hangout.budgetEstimate ? (
          <Text style={[text.body.sm, { color: colors.textSecondary, marginLeft: 6 }]}>
            ₹{hangout.budgetEstimate}/head
          </Text>
        ) : null}
      </View>

      {/* RSVP counts */}
      <View style={[styles.rsvpRow, { marginTop: spacing.sm }]}>
        <View style={styles.rsvpCount}>
          <Check size={15} color={colors.positive} weight="bold" />
          <Text style={[text.label.md, { color: colors.positive, fontFamily: 'Outfit-SemiBold' }]}>
            {hangout.yesCount}
          </Text>
        </View>
        <View style={styles.rsvpCount}>
          <Question size={15} color={colors.warning} weight="bold" />
          <Text style={[text.label.md, { color: colors.warning, fontFamily: 'Outfit-SemiBold' }]}>
            {hangout.maybeCount}
          </Text>
        </View>
        <View style={styles.rsvpCount}>
          <X size={15} color={colors.negative} weight="bold" />
          <Text style={[text.label.md, { color: colors.negative, fontFamily: 'Outfit-SemiBold' }]}>
            {hangout.noCount}
          </Text>
        </View>

        {/* My vote indicator */}
        {myVote && MyVoteIcon && (
          <View style={[styles.myVotePill, {
            backgroundColor: colors.bgTertiary,
            borderRadius:    radius.full,
            borderColor:     colors.hairline,
            borderWidth:     1,
            marginLeft:      'auto',
          }]}>
            <Text style={[text.label.sm, { color: colors.textMuted }]}>You:</Text>
            <MyVoteIcon size={13} color={colors.textMuted} weight="bold" />
            <Text style={[text.label.sm, { color: colors.textMuted }]}>{myVote}</Text>
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
            <Text style={[text.label.sm, { color: colors.accentPrimary }]}>Tap to vote</Text>
            <CaretRight size={13} color={colors.accentPrimary} />
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card:     {},
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  rsvpRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rsvpCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  myVotePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
})
