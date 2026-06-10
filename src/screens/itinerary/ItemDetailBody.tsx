// src/screens/itinerary/ItemDetailBody.tsx
// Scrollable body of the detail sheet — below the header and map.
//
// Sections (in order):
//   1. Time slot row (if present)
//   2. Duration + estimated cost row (if present)
//   3. Rating + price level row (if placeRef)
//   4. Notes section (if present)
//   5. Linked expenses section (always — shows count + "Link expenses" button)
//   6. Vote section (if tentative — shows current vote tally)
//   7. Added by + timestamp footer

import {
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTheme } from '../../theme'
import type { ItineraryItem } from '../../lib/schemas'
import { useActivityVoting } from '../../hooks/useActivityVoting'
import { ProposalVoteChips } from './ProposalVoteChips'

interface ItemDetailBodyProps {
  item:            ItineraryItem
  memberNames:     Record<string, string>  // uid → display name
  onLinkExpenses:  () => void
  myUid:           string
  onVote:          (vote: 'up' | 'down') => void
}

// Price level to label
function priceLabel(level?: 0 | 1 | 2 | 3 | 4): string {
  const map: Record<number, string> = { 0: 'Free', 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' }
  return level !== undefined ? (map[level] ?? '') : ''
}

function SectionLabel({ label }: { label: string }) {
  const { colors, text, spacing } = useTheme()
  return (
    <Text
      style={[
        text.label.sm,
        {
          color:         colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom:  spacing.xs,
        },
      ]}
    >
      {label}
    </Text>
  )
}

export function ItemDetailBody({
  item,
  memberNames,
  onLinkExpenses,
  myUid,
  onVote,
}: ItemDetailBodyProps) {
  const { colors, text, spacing, radius } = useTheme()

  const addedByName = memberNames[item.addedByUid] ?? 'Someone'
  
  const { voteOnProposal, summary, myVote: proposalVote } = useActivityVoting(item.id)
  const isProposal = !!item.proposalMeta
  const isProposalOpen = item.proposalMeta?.state === 'open'

  const legacyMyVote = (!isProposal && item.votes.up)
    ? (item.votes.up.includes(myUid) ? 'up' : item.votes.down.includes(myUid) ? 'down' : null)
    : null

  return (
    <View style={{ gap: spacing.xl, padding: spacing.lg }}>

      {/* ── Time + Duration + Cost row ─────────────────────────── */}
      {(item.timeSlot || item.estimatedCost || item.duration) && (
        <View style={styles.pillRow}>
          {item.timeSlot && (
            <View
              style={[
                styles.infoPill,
                {
                  backgroundColor: colors.bgTertiary,
                  borderColor:     colors.border,
                  borderRadius:    radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   spacing.xs,
                },
              ]}
            >
              <Text style={[text.mono.sm, { color: colors.textPrimary }]}>
                🕐 {item.timeSlot.startTime}
                {item.timeSlot.endTime ? ` – ${item.timeSlot.endTime}` : ''}
              </Text>
            </View>
          )}

          {item.duration && (
            <View
              style={[
                styles.infoPill,
                {
                  backgroundColor: colors.bgTertiary,
                  borderColor:     colors.border,
                  borderRadius:    radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   spacing.xs,
                },
              ]}
            >
              <Text style={[text.label.md, { color: colors.textSecondary }]}>
                ⏱ {item.duration < 60
                  ? `${item.duration}m`
                  : `${Math.floor(item.duration / 60)}h ${item.duration % 60 > 0 ? `${item.duration % 60}m` : ''}`}
              </Text>
            </View>
          )}

          {item.estimatedCost ? (
            <View
              style={[
                styles.infoPill,
                {
                  backgroundColor: `${colors.accentGold}12`,
                  borderColor:     `${colors.accentGold}40`,
                  borderRadius:    radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   spacing.xs,
                },
              ]}
            >
              <Text style={[text.mono.sm, { color: colors.accentGold }]}>
                ₹{item.estimatedCost.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Google Place details ─────────────────────────────────── */}
      {item.placeRef && (item.placeRef.rating || item.placeRef.priceLevel !== undefined) && (
        <View>
          <SectionLabel label="Place info" />
          <View style={styles.pillRow}>
            {item.placeRef.rating && (
              <Text style={[text.mono.sm, { color: colors.accentGold }]}>
                ⭐ {item.placeRef.rating.toFixed(1)}
              </Text>
            )}
            {item.placeRef.priceLevel !== undefined && (
              <Text style={[text.label.md, { color: colors.textSecondary }]}>
                {priceLabel(item.placeRef.priceLevel)}
              </Text>
            )}
            {item.placeRef.website && (
              <Text
                style={[text.label.md, { color: colors.accentPrimary }]}
                numberOfLines={1}
              >
                🔗 Website
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ── Notes ───────────────────────────────────────────────── */}
      {item.notes ? (
        <View>
          <SectionLabel label="Notes" />
          <Text
            style={[
              text.body.sm,
              {
                color:           colors.textSecondary,
                lineHeight:      22,
                backgroundColor: colors.bgTertiary,
                borderRadius:    radius.md,
                padding:         spacing.md,
              },
            ]}
          >
            {item.notes}
          </Text>
        </View>
      ) : null}

      {/* ── Linked expenses ─────────────────────────────────────── */}
      <View>
        <SectionLabel label="Linked expenses" />
        <View
          style={[
            styles.linkedRow,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius:    radius.md,
              padding:         spacing.md,
              borderColor:     colors.border,
              borderWidth:     1,
            },
          ]}
        >
          <Text style={[text.body.sm, { color: colors.textSecondary, flex: 1 }]}>
            {item.linkedExpenseIds.length === 0
              ? 'No expenses linked yet'
              : `${item.linkedExpenseIds.length} expense${item.linkedExpenseIds.length > 1 ? 's' : ''} linked`}
          </Text>
          <Text
            style={[text.label.md, { color: colors.accentPrimary }]}
            onPress={onLinkExpenses}
            accessibilityRole="button"
            accessibilityLabel="Link expenses to this stop"
          >
            {item.linkedExpenseIds.length > 0 ? 'Edit' : '+ Link'}
          </Text>
        </View>
      </View>

      {/* ── Vote tally / Proposal Voting controls ───────────────── */}
      {isProposal ? (
        <View style={{ gap: spacing.md }}>
          <View>
            <SectionLabel label="Vote results" />
            <View style={styles.voteTally}>
              <View style={styles.voteCount}>
                <Text style={{ fontSize: 24 }}>👍</Text>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  {summary.yesCount}
                </Text>
                <Text style={[text.label.sm, { color: colors.textMuted }]}>
                  Going
                </Text>
              </View>
              <View style={[styles.voteDivider, { backgroundColor: colors.border }]} />
              <View style={styles.voteCount}>
                <Text style={{ fontSize: 24 }}>💬</Text>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  {summary.maybeCount}
                </Text>
                <Text style={[text.label.sm, { color: colors.textMuted }]}>
                  Maybe
                </Text>
              </View>
              <View style={[styles.voteDivider, { backgroundColor: colors.border }]} />
              <View style={styles.voteCount}>
                <Text style={{ fontSize: 24 }}>👎</Text>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  {summary.noCount}
                </Text>
                <Text style={[text.label.sm, { color: colors.textMuted }]}>
                  Not going
                </Text>
              </View>
            </View>
          </View>

          {isProposalOpen && (
            <View>
              <SectionLabel label="Cast your vote" />
              <ProposalVoteChips
                myVote={proposalVote}
                onVote={voteOnProposal}
              />
            </View>
          )}
        </View>
      ) : (
        !item.isConfirmed && (
          <View>
            <SectionLabel label="Group vote" />
            <View style={styles.voteTally}>
              <View style={styles.voteCount}>
                <Text style={{ fontSize: 24 }}>👍</Text>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  {item.votes.up?.length ?? 0}
                </Text>
                <Text style={[text.label.sm, { color: colors.textMuted }]}>
                  {(item.votes.up?.length ?? 0) === 1 ? 'vote' : 'votes'}
                </Text>
              </View>
              <View
                style={[styles.voteDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.voteCount}>
                <Text style={{ fontSize: 24 }}>👎</Text>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  {item.votes.down?.length ?? 0}
                </Text>
                <Text style={[text.label.sm, { color: colors.textMuted }]}>
                  {(item.votes.down?.length ?? 0) === 1 ? 'vote' : 'votes'}
                </Text>
              </View>
            </View>

            {/* My vote indicator */}
            {legacyMyVote && (
              <Text
                style={[
                  text.label.sm,
                  {
                    color:     legacyMyVote === 'up' ? colors.accentPrimary : colors.accentDanger,
                    marginTop: spacing.xs,
                    textAlign: 'center',
                  },
                ]}
              >
                You voted {legacyMyVote === 'up' ? '👍' : '👎'}
                {' · '}
                <Text onPress={() => onVote(legacyMyVote === 'up' ? 'down' : 'up')}>
                  Change vote
                </Text>
              </Text>
            )}
          </View>
        )
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <Text
        style={[
          text.label.sm,
          { color: colors.textMuted, textAlign: 'center' },
        ]}
      >
        Added by {addedByName}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    alignItems:    'center',
  },
  infoPill: {
    borderWidth: 1,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  voteTally: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-around',
    gap:            16,
  },
  voteCount: {
    alignItems: 'center',
    gap:        4,
    flex:       1,
  },
  voteDivider: {
    width:  1,
    height: 40,
  },
})
