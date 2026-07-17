// src/components/group/ActivityFeedItem.tsx
// Kora & Ink feed item — Blueprint §4.3.2. The feed is the canonical stitch
// surface: a vertical stitch runs down a 28pt left gutter, the actor's avatar
// knot sits ON the line, the sentence reads in bodyMd, and money events carry a
// trailing <Amount>. Non-money events (joins, notes, list/hangout activity)
// render one size smaller in textSecondary with no amount — the feed
// prioritizes money without hiding life. No emoji badges, no threadLine View.

import React, { memo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import { Stitch, Amount } from '@components/ui'
import type { ActivityItem, UserInput } from '@lib/schemas'
import { feedTimestamp } from '@lib/utils/date'
import { formatINR } from '@lib/utils/currency'
import { Timestamp } from 'firebase/firestore'
import { useExpenseStore } from '../../stores/expense.store'
import { useGroupStore } from '../../stores/group.store'
import { ReceiptChip } from '../../screens/expense/components/ReceiptChip'

interface Props {
  item:    ActivityItem
  members: Map<string, UserInput>
  isLast:  boolean
  /** 'live' = today's segment (madder), 'dim' = older (§4.3.2). */
  tone?:   'live' | 'dim'
  onPress?: (item: ActivityItem) => void
}

const MONEY_TYPES = new Set<ActivityItem['type']>(['expense_added', 'settled'])

export const ActivityFeedItem = memo(function ActivityFeedItem({
  item,
  members,
  isLast,
  tone = 'dim',
  onPress,
}: Props) {
  const { colors, text, spacing } = useTheme()

  const activeGroupId = useGroupStore((s) => s.activeGroup?.id)
  const expense = useExpenseStore((s) =>
    item.metadata?.expenseId && activeGroupId
      ? s.expensesByGroup[activeGroupId]?.find((e) => e.id === item.metadata?.expenseId)
      : undefined
  )
  const receiptUrl = expense?.receiptUrl

  const actor = members.get(item.actorUid)
  const actorName = actor?.name?.split(' ')[0] ?? 'Someone'
  const isMoney = MONEY_TYPES.has(item.type)

  const ts = item.createdAt as unknown as Timestamp
  const timeStr = ts?.toDate ? feedTimestamp(ts.toDate()) : ''

  const handlePress = () => onPress?.(item)

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={styles.container}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={buildA11yLabel(item, actorName)}
    >
      {/* Left gutter: the stitch spine + avatar knot sitting ON the line */}
      <View style={styles.gutter}>
        {!isLast && (
          <View style={styles.spine} pointerEvents="none">
            <Stitch direction="vertical" tone={tone} />
          </View>
        )}
        <Avatar
          name={actor?.name ?? '?'}
          imageUrl={actor?.photoUrl}
          color={actor?.avatarColor ?? colors.accentPrimary}
          size="xs"
        />
      </View>

      {/* Right: content */}
      <View style={[styles.right, { marginLeft: spacing.md }]}>
        <View style={styles.titleRow}>
          <Text
            style={[
              isMoney ? text.body.md : text.body.sm,
              { color: isMoney ? colors.textPrimary : colors.textSecondary, flex: 1 },
            ]}
            numberOfLines={2}
          >
            {buildPrimaryText(item, actorName)}
          </Text>
          {isMoney && item.metadata?.amount != null && (
            <View style={{ marginLeft: spacing.sm }}>
              <Amount
                value={item.metadata.amount}
                size="md"
                settled={item.type === 'settled'}
              />
            </View>
          )}
        </View>

        {item.type === 'expense_added' && item.metadata?.expenseId && (
          <ReceiptChip
            expenseId={item.metadata.expenseId}
            receiptUrl={receiptUrl}
            onPress={handlePress}
            style={{ marginTop: spacing.xs }}
          />
        )}

        {item.type === 'note' && item.metadata?.note && (
          <Text
            style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' }]}
            numberOfLines={3}
          >
            {item.metadata.note}
          </Text>
        )}

        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {timeStr}
        </Text>
      </View>
    </Pressable>
  )
})

// Human-readable sentence for each activity type.
function buildPrimaryText(item: ActivityItem, actorName: string): React.ReactNode {
  switch (item.type) {
    case 'expense_added':
      return `${actorName} added ${item.metadata?.title ?? 'an expense'}`
    case 'member_joined':
      return `${actorName} joined the group`
    case 'settled':
      return `${actorName} settled up`
    case 'note':
      return `${actorName} left a note`
    case 'trip_event':
      return item.metadata?.title ?? `${actorName} added an event`
    case 'budget-set':
      return `${actorName} set the trip budget to ${formatINR(item.metadata?.amount ?? 0)}`
    case 'budget-updated':
      return `${actorName} updated the trip budget to ${formatINR(item.metadata?.amount ?? 0)}`
    case 'budget-removed':
      return `${actorName} removed the trip budget`
    case 'list_created':
      return `${actorName} started ${item.metadata?.title ?? 'a list'}`
    case 'list_item_claimed':
      return `${actorName} claimed ${item.metadata?.title ?? 'an item'}`
    case 'list_item_completed':
      return `${actorName} checked off ${item.metadata?.title ?? 'an item'}`
    case 'list_items_added':
      return `${actorName} added to ${item.metadata?.title ?? 'a list'}`
    case 'hangout_proposed':
      return `${actorName} proposed ${item.metadata?.title ?? 'a hangout'}`
    case 'hangout_rsvp': {
      const voteVal = item.metadata?.rsvpValue
      const voteLabel = voteVal === 'yes' ? 'yes' : voteVal === 'maybe' ? 'maybe' : 'no'
      return `${actorName} voted ${voteLabel} on ${item.metadata?.title ?? 'a hangout'}`
    }
    case 'hangout_confirmed':
      return `${item.metadata?.title ?? 'Hangout'} is on — ${item.metadata?.yesCount ?? 0} going`
    default:
      return item.metadata?.title ?? 'Activity'
  }
}

function buildA11yLabel(item: ActivityItem, actorName: string): string {
  switch (item.type) {
    case 'expense_added':
      return `${actorName} added expense: ${item.metadata?.title ?? ''}, ₹${item.metadata?.amount ?? ''}`
    case 'settled':
      return `${actorName} settled up: ₹${item.metadata?.amount ?? ''}`
    default:
      return typeof buildPrimaryText(item, actorName) === 'string'
        ? (buildPrimaryText(item, actorName) as string)
        : 'Activity item'
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  gutter: {
    width: 28,
    alignItems: 'center',
  },
  spine: {
    position: 'absolute',
    top: 12,
    bottom: -24,
    width: 2,
  },
  right: {
    flex: 1,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
})
