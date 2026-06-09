// src/screens/itinerary/ItemDetailHeader.tsx
// Top section of ItemDetailSheet:
//   [category icon 48dp] [title + address] [action menu button]
//
// Action menu (3-dot) opens an ActionSheet with:
//   - Edit
//   - Move to another day
//   - Delete (destructive)
//   - Cancel
//
// Category icon is larger here (48dp) than in the list card (32dp)
// Confirmed items: icon has solid teal ring border
// Tentative items: icon has dashed teal ring border

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTheme }    from '../../theme'
import { CATEGORY_META } from '../../lib/schemas'
import type { ItineraryItem } from '../../lib/schemas'

interface ItemDetailHeaderProps {
  item:       ItineraryItem
  onEdit:     () => void
  onMove:     () => void
  onDelete:   () => void
}

export function ItemDetailHeader({
  item,
  onEdit,
  onMove,
  onDelete,
}: ItemDetailHeaderProps) {
  const { colors, text, spacing, radius } = useTheme()
  const meta      = CATEGORY_META[item.category]
  const confirmed = item.isConfirmed

  function handleActionMenu() {
    Alert.alert(
      item.title,
      undefined,
      [
        { text: 'Edit',              onPress: onEdit  },
        { text: 'Move to day...',    onPress: onMove  },
        {
          text:  'Delete stop',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete this stop?',
              `"${item.title}" will be removed from the itinerary.`,
              [
                { text: 'Cancel',         style: 'cancel' },
                { text: 'Delete',         style: 'destructive', onPress: onDelete },
              ],
            )
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    )
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.md,
          gap:               spacing.md,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconCircle,
          {
            width:           48,
            height:          48,
            borderRadius:    24,
            backgroundColor: colors.bgTertiary,
            borderColor:     confirmed ? colors.accentPrimary : colors.border,
            borderWidth:     confirmed ? 2 : 1,
            // Dashed border simulation — RN doesn't support borderStyle on Views natively
            // We use a reduced opacity ring for tentative state instead
          },
        ]}
      >
        <Text style={{ fontSize: 24 }} accessibilityLabel={meta.label}>
          {item.emoji ?? meta.emoji}
        </Text>
        {!confirmed && (
          // Tentative indicator — small orange dot top-right
          <View
            style={[
              styles.tentativeDot,
              { backgroundColor: colors.accentGold },
            ]}
          />
        )}
      </View>

      {/* Title + address */}
      <View style={styles.titleBlock}>
        <Text
          style={[text.heading.sm, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.placeRef?.address ? (
          <Text
            style={[text.label.md, { color: colors.textSecondary, marginTop: 2 }]}
            numberOfLines={2}
          >
            {item.placeRef.address}
          </Text>
        ) : null}

        {/* Status pill */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: confirmed
                ? `${colors.accentPrimary}18`
                : `${colors.accentGold}18`,
              borderColor:  confirmed ? colors.accentPrimary : colors.accentGold,
              borderRadius: radius.full,
              marginTop:    spacing.xs,
              alignSelf:    'flex-start',
              paddingHorizontal: spacing.sm,
              paddingVertical:   2,
            },
          ]}
        >
          <Text
            style={[
              text.label.sm,
              { color: confirmed ? colors.accentPrimary : colors.accentGold },
            ]}
          >
            {confirmed ? '✓ Confirmed' : '⏳ Tentative'}
          </Text>
        </View>
      </View>

      {/* Action menu button */}
      <Pressable
        onPress={handleActionMenu}
        style={({ pressed }) => [
          styles.menuButton,
          {
            backgroundColor: pressed ? colors.bgTertiary : 'transparent',
            borderRadius:    radius.sm,
            padding:         spacing.sm,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="More actions"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 22, lineHeight: 22 }}>
          ⋮
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
  iconCircle: {
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    flexShrink:     0,
  },
  tentativeDot: {
    position:     'absolute',
    top:          -2,
    right:        -2,
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  titleBlock: {
    flex: 1,
  },
  statusPill: {
    borderWidth: 1,
  },
  menuButton: {
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
})
