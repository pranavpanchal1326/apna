// src/screens/itinerary/ItineraryItemCard.tsx
// Single itinerary item card.
//
// LAYOUT (left to right):
//   [thread line — behind] [category icon circle 32dp] [card content] [drag handle]
//
// STATES:
//   normal    — solid border, full opacity
//   tentative — dashed border, 85% opacity, shows VoteChips
//   confirmed — solid accent border, checkmark badge
//   dragging  — elevated shadow, scale 1.02, haptic on pickup
//
// LONG PRESS → drag mode (handled by DraggableFlatList)
// TAP         → navigate to ExpenseDetailScreen if linkedExpenseIds.length > 0
//             → else open EditItemSheet (Prompt 2.3)
//
// SWIPE LEFT  → delete (red background with trash icon, confirm before delete)
//             (Fallback/simplified: Trash icon on the card, confirms before delete)

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useTheme } from '../../theme'
import { CATEGORY_META } from '../../lib/schemas'
import { VoteChips }          from './VoteChips'
import { ItemTimeSlotBadge }  from './ItemTimeSlotBadge'
import type { ItineraryItem } from '../../lib/schemas'
import type { RenderItemParams } from 'react-native-draggable-flatlist'

interface ItineraryItemCardProps {
  item:       ItineraryItem
  drag:       RenderItemParams<ItineraryItem>['drag']
  isActive:   boolean   // True when being dragged
  myUid:      string
  onVote:     (itemId: string, vote: 'up' | 'down') => void
  onDelete:   (itemId: string) => void
  onPress:    (item: ItineraryItem) => void
}

export function ItineraryItemCard({
  item,
  drag,
  isActive,
  myUid,
  onVote,
  onDelete,
  onPress,
}: ItineraryItemCardProps) {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const meta       = CATEGORY_META[item.category]
  const tentative  = !item.isConfirmed
  const confirmed  = item.isConfirmed

  // Format estimated cost
  const costLabel = item.estimatedCost
    ? `₹${item.estimatedCost.toLocaleString('en-IN')}`
    : null

  const cardStyle = [
    styles.card,
    {
      backgroundColor:  colors.bgSecondary,
      borderRadius:     radius.lg,
      marginLeft:       spacing.xl + 32 + spacing.md,  // 24 + 32 + 12 = 68dp (clear of thread + icon)
      marginRight:      spacing.lg,
      marginBottom:     spacing.sm,
      padding:          spacing.md,
      borderWidth:      1,
      borderColor:      confirmed
        ? colors.accentPrimary
        : tentative
          ? colors.border
          : colors.border,
      borderStyle:      tentative ? 'dashed' as const : 'solid' as const,
      opacity:          tentative ? 0.88 : 1,
    },
    isActive && {
      ...shadows.elevated,
      transform: [{ scale: 1.02 }],
    },
  ]

  return (
    <View style={styles.row}>
      {/* Category icon circle — sits on thread line */}
      <View
        style={[
          styles.iconCircle,
          {
            left:            spacing.xl,           // 24dp from screen edge
            backgroundColor: colors.bgTertiary,
            borderColor:     confirmed ? colors.accentPrimary : colors.border,
            borderWidth:     confirmed ? 1.5 : 1,
          },
        ]}
      >
        <Text style={styles.iconEmoji} accessibilityLabel={meta.label}>
          {item.emoji ?? meta.emoji}
        </Text>
        {confirmed && (
          <View style={[styles.confirmDot, { backgroundColor: colors.accentPrimary }]} />
        )}
      </View>

      {/* Card */}
      <View style={styles.cardWrapper}>
        {/* Time badge above card */}
        {item.timeSlot && <ItemTimeSlotBadge timeSlot={item.timeSlot} />}

        <Pressable
          style={cardStyle}
          onPress={() => onPress(item)}
          onLongPress={drag}
          delayLongPress={250}
          android_ripple={{ color: `${colors.accentPrimary}10`, borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${tentative ? ', tentative' : ''}`}
        >
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text
              style={[text.body.md, { color: colors.textPrimary, flex: 1 }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {/* Trash Delete button */}
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight')
                onDelete(item.id)
              }}
              style={styles.deleteButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Delete stop"
              accessibilityRole="button"
            >
              <Text style={{ color: colors.accentDanger, fontSize: 16 }}>🗑️</Text>
            </Pressable>
            {/* Drag handle — always rendered for touch target, visible on long press */}
            <View style={styles.dragHandle} accessibilityLabel="Hold to reorder">
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>⠿</Text>
            </View>
          </View>

          {/* Place address */}
          {item.placeRef?.address ? (
            <Text
              style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.xs }]}
              numberOfLines={1}
            >
              {item.placeRef.address}
            </Text>
          ) : null}

          {/* Notes */}
          {item.notes ? (
            <Text
              style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs }]}
              numberOfLines={2}
            >
              {item.notes}
            </Text>
          ) : null}

          {/* Footer row: cost + rating + linked expenses */}
          <View style={[styles.footerRow, { marginTop: spacing.sm }]}>
            {costLabel && (
              <Text style={[text.mono.sm, { color: colors.accentGold }]}>
                {costLabel}
              </Text>
            )}
            {item.placeRef?.rating ? (
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>
                ⭐ {item.placeRef.rating.toFixed(1)}
              </Text>
            ) : null}
            {item.linkedExpenseIds && item.linkedExpenseIds.length > 0 && (
              <Text style={[text.label.sm, { color: colors.accentPrimary }]}>
                💸 {item.linkedExpenseIds.length} expense{item.linkedExpenseIds.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Vote chips — tentative items only */}
          {tentative && (
            <VoteChips
              votes={item.votes}
              myUid={myUid}
              onVote={(vote) => onVote(item.id, vote)}
            />
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
  },
  iconCircle: {
    position:     'absolute',
    width:        32,
    height:       32,
    borderRadius: 16,
    alignItems:   'center',
    justifyContent: 'center',
    top:          12,   // Vertically centered with card title area
    zIndex:       2,
  },
  confirmDot: {
    position:     'absolute',
    width:        8,
    height:       8,
    borderRadius: 4,
    bottom:       -1,
    right:        -1,
  },
  iconEmoji: {
    fontSize: 16,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingTop:  2,
  },
  dragHandle: {
    paddingLeft: 4,
    paddingTop:  2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    flexWrap:      'wrap',
  },
})
