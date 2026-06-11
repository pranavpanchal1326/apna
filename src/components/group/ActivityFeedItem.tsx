// src/components/group/ActivityFeedItem.tsx
// Renders a single activity feed item.
// Supports 5 types: expense_added | member_joined | settled | note | trip_event
// Each type has its own layout, icon, and color treatment.
// The Dhaga thread line connects consecutive items visually.

import React, { memo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { ActivityItem, UserInput } from '@lib/schemas'
import { feedTimestamp } from '@lib/utils/date'
import { formatINR } from '@lib/utils/currency'
import { Timestamp } from 'firebase/firestore'
import { useExpenseStore } from '../../stores/expense.store'
import { useGroupStore } from '../../stores/group.store'
import { ReceiptChip } from '../../screens/expense/components/ReceiptChip'

interface Props {
  item:       ActivityItem
  members:    Map<string, UserInput>
  isLast:     boolean
  onPress?:   (item: ActivityItem) => void
}

// Icon + color for each activity type
const TYPE_CONFIG: Record<
  ActivityItem['type'],
  { icon: string; color: (colors: ReturnType<typeof useTheme>['colors']) => string }
> = {
  expense_added: { icon: '💸', color: (c) => c.accentPrimary   },
  member_joined: { icon: '👋', color: (c) => c.accentGold      },
  settled:       { icon: '✅', color: (c) => c.positive        },
  note:          { icon: '📝', color: (c) => c.textSecondary   },
  trip_event:    { icon: '📍', color: (c) => c.accentPrimary   },
  'budget-set':          { icon: '🎯', color: (c) => c.accentPrimary   },
  'budget-updated':      { icon: '🔄', color: (c) => c.accentGold      },
  'budget-removed':      { icon: '🗑️', color: (c) => c.accentDanger    },
  // ── List events ─────────────────────────────────────────────────
  list_created:          { icon: '📋', color: (c) => c.accentPrimary   },
  list_item_claimed:     { icon: '🤝', color: (c) => c.accentGold      },
  list_item_completed:   { icon: '✓',  color: (c) => c.positive        },
  list_items_added:      { icon: '➕', color: (c) => c.accentPrimary   },
  // ── Hangout events ───────────────────────────────────────────────
  hangout_proposed:      { icon: '🎉', color: (c) => c.accentGold      },
  hangout_rsvp:          { icon: '👍', color: (c) => c.accentPrimary   },
  hangout_confirmed:     { icon: '✅', color: (c) => c.positive        },
}

export const ActivityFeedItem = memo(function ActivityFeedItem({
  item,
  members,
  isLast,
  onPress,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()

  const activeGroupId = useGroupStore((s) => s.activeGroup?.id)
  const expense = useExpenseStore((s) =>
    item.metadata?.expenseId && activeGroupId
      ? s.expensesByGroup[activeGroupId]?.find((e) => e.id === item.metadata?.expenseId)
      : undefined
  )
  const receiptUrl = expense?.receiptUrl

  const actor    = members.get(item.actorUid)
  const actorName = actor?.name?.split(' ')[0] ?? 'Someone'
  const config   = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.note
  const iconColor = config.color(colors)

  const ts = item.createdAt as unknown as Timestamp
  const timeStr = ts?.toDate ? feedTimestamp(ts.toDate()) : ''

  const handlePress = () => onPress?.(item)

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.md,
          opacity:           pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={buildA11yLabel(item, actorName)}
    >
      {/* Left: thread line + avatar */}
      <View style={styles.left}>
        {/* Avatar with type icon badge */}
        <View style={styles.avatarWrapper}>
          <Avatar
            name={actor?.name ?? '?'}
            imageUrl={actor?.photoUrl}
            color={actor?.avatarColor ?? '#4ECDC4'}
            size="sm"
          />
          {/* Type icon badge */}
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: colors.bgTertiary,
                borderColor:     colors.bgPrimary,
                borderWidth:     1.5,
                borderRadius:    radius.full,
                bottom:          -4,
                right:           -4,
              },
            ]}
          >
            <Text style={{ fontSize: 10 }}>{config.icon}</Text>
          </View>
        </View>

        {/* Dhaga thread line — connects to next item */}
        {!isLast && (
          <View
            style={[
              styles.threadLine,
              {
                backgroundColor: colors.threadLine,
                marginTop:       spacing.xs,
              },
            ]}
          />
        )}
      </View>

      {/* Right: content */}
      <View style={[styles.right, { marginLeft: spacing.md }]}>
        {/* Primary text */}
        <View style={styles.titleRow}>
          <Text
            style={[text.body.md, { color: colors.textPrimary, flex: 1 }]}
            numberOfLines={2}
          >
            {buildPrimaryText(item, actorName)}
          </Text>
        </View>


        {/* Amount — shown only for expense / settled types */}
        {(item.type === 'expense_added' || item.type === 'settled') &&
          item.metadata?.amount != null && (
            <Text
              style={[
                text.mono.md,
                {
                  color:      iconColor,
                  marginTop:  2,
                },
              ]}
            >
              {item.type === 'settled' ? '−' : '+'}
              {formatINR(item.metadata.amount)}
            </Text>
          )}

        {item.type === 'expense_added' && item.metadata?.expenseId && (
          <ReceiptChip
            expenseId={item.metadata.expenseId}
            receiptUrl={receiptUrl}
            onPress={handlePress}
            style={{ marginTop: spacing.xs }}
          />
        )}

        {/* Note text */}
        {item.type === 'note' && item.metadata?.note && (
          <Text
            style={[
              text.body.sm,
              {
                color:      colors.textSecondary,
                marginTop:  spacing.xs,
                fontStyle:  'italic',
              },
            ]}
            numberOfLines={3}
          >
            "{item.metadata.note}"
          </Text>
        )}

        {/* Timestamp */}
        <Text
          style={[
            text.label.sm,
            { color: colors.textMuted, marginTop: spacing.xs },
          ]}
        >
          {timeStr}
        </Text>
      </View>
    </Pressable>
  )
})

// Build human-readable primary text for each activity type
function buildPrimaryText(
  item:      ActivityItem,
  actorName: string
): React.ReactNode {
  switch (item.type) {
    case 'expense_added':
      return `${actorName} added "${item.metadata?.title ?? 'an expense'}"`
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
      return `${actorName} removed the trip budget (was ${formatINR(item.metadata?.amount ?? 0)})`
    case 'hangout_proposed':
      return `${actorName} proposed "${item.metadata?.title ?? 'a hangout'}"`
    case 'hangout_rsvp': {
      const voteVal = item.metadata?.rsvpValue
      const voteLabel = voteVal === 'yes' ? 'Yes' : voteVal === 'maybe' ? 'Maybe' : 'No'
      return `${actorName} voted ${voteLabel} on "${item.metadata?.title ?? 'hangout'}"`
    }
    case 'hangout_confirmed':
      return `"${item.metadata?.title ?? 'Hangout'}" is confirmed — ${item.metadata?.yesCount ?? 0} going`
    default:
      return item.metadata?.title ?? 'Activity'
  }
}

function buildA11yLabel(item: ActivityItem, actorName: string): string {
  switch (item.type) {
    case 'expense_added':
      return `${actorName} added expense: ${item.metadata?.title ?? ''}, ₹${item.metadata?.amount ?? ''}`
    case 'member_joined':
      return `${actorName} joined the group`
    case 'settled':
      return `${actorName} settled up: ₹${item.metadata?.amount ?? ''}`
    case 'budget-set':
      return `${actorName} set the trip budget to ₹${item.metadata?.amount ?? ''}`
    case 'budget-updated':
      return `${actorName} updated the trip budget to ₹${item.metadata?.amount ?? ''}`
    case 'budget-removed':
      return `${actorName} removed the trip budget`
    case 'hangout_proposed':
      return `${actorName} proposed hangout: ${item.metadata?.title ?? ''}`
    case 'hangout_rsvp':
      return `${actorName} voted ${item.metadata?.rsvpValue ?? ''} on hangout: ${item.metadata?.title ?? ''}`
    case 'hangout_confirmed':
      return `Hangout confirmed: ${item.metadata?.title ?? ''}, ${item.metadata?.yesCount ?? 0} going`
    default:
      return item.metadata?.title ?? 'Activity item'
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
  left: {
    alignItems:  'center',
    width:       40,
  },
  avatarWrapper: {
    position: 'relative',
  },
  typeBadge: {
    position:       'absolute',
    width:          20,
    height:         20,
    alignItems:     'center',
    justifyContent: 'center',
  },
  threadLine: {
    width:  2,
    flex:   1,
    minHeight: 20,
  },
  right: {
    flex:           1,
    paddingBottom:  12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
})
