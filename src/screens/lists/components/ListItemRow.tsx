// src/screens/lists/components/ListItemRow.tsx
// A single item row in a shared list.
// Handles: check toggle, claim/unclaim, deadline badge, swipe-to-delete hint.

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../../theme'
import { DeadlineBadge } from './DeadlineBadge'
import type { SharedListItem } from '../../../lib/schemas/list.schema'
import type { UserInput } from '../../../lib/schemas'

interface Props {
  item:      SharedListItem
  myUid:     string
  members:   Map<string, UserInput>
  groupId:   string
  listId:    string
  onToggle:  (itemId: string, checked: boolean) => Promise<void>
  onClaim:   (itemId: string, uid: string | null) => Promise<void>
  onDelete:  (itemId: string) => Promise<void>
  onEdit:    (item: SharedListItem) => void
}

export function ListItemRow({
  item, myUid, members, onToggle, onClaim, onDelete, onEdit,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [toggling, setToggling] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const claimer = item.claimedBy
    ? members.get(item.claimedBy)
    : null

  const claimerName = claimer
    ? (claimer.name ?? 'Someone')
    : null

  const isMyClaim = item.claimedBy === myUid

  const handleToggle = useCallback(async () => {
    if (toggling) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setToggling(true)
    try {
      await onToggle(item.id, !item.checked)
    } finally {
      setToggling(false)
    }
  }, [item.id, item.checked, onToggle, toggling])

  const handleClaim = useCallback(async () => {
    if (claiming) return
    Haptics.selectionAsync()
    setClaiming(true)
    try {
      if (isMyClaim) {
        // Unclaim
        await onClaim(item.id, null)
      } else if (item.claimedBy) {
        // Claimed by someone else — show confirmation
        Alert.alert(
          'Take over?',
          `${claimerName} already claimed this. Take it over?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setClaiming(false) },
            {
              text: 'Take over',
              style: 'destructive',
              onPress: async () => {
                try { await onClaim(item.id, myUid) }
                finally { setClaiming(false) }
              },
            },
          ],
        )
        return
      } else {
        // Unclaimed — claim it
        await onClaim(item.id, myUid)
      }
    } finally {
      setClaiming(false)
    }
  }, [claiming, isMyClaim, item.id, item.claimedBy, claimerName, onClaim, myUid])

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      item.text,
      undefined,
      [
        { text: 'Edit',   onPress: () => onEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete item?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ])
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    )
  }, [item, onEdit, onDelete])

  const rowBg = item.checked
    ? colors.bgTertiary + '80'
    : colors.bgSecondary

  return (
    <Pressable
      onPress={handleToggle}
      onLongPress={handleLongPress}
      style={[
        styles.row,
        {
          backgroundColor:  rowBg,
          borderRadius:     radius.md,
          marginHorizontal: spacing.md,
          marginVertical:   4,
          borderColor:      colors.border,
          borderWidth:      1,
          padding:          spacing.md,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      accessibilityLabel={item.text}
    >
      {/* Checkbox */}
      <View style={[
        styles.checkbox,
        {
          borderColor:     item.checked ? colors.accentPrimary : colors.textMuted,
          backgroundColor: item.checked ? colors.accentPrimary : 'transparent',
          borderRadius:    radius.sm,
        },
      ]}>
        {toggling
          ? <ActivityIndicator size={12} color={colors.bgPrimary} />
          : item.checked && <Text style={{ color: colors.bgPrimary, fontSize: 11, fontWeight: '700' }}>✓</Text>
        }
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            text.body.md,
            {
              color:             item.checked ? colors.textMuted : colors.textPrimary,
              textDecorationLine: item.checked ? 'line-through' : 'none',
              flexShrink:        1,
            },
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>

        {item.notes ? (
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}

        <DeadlineBadge deadlineDate={item.deadlineDate} />
      </View>

      {/* Claim badge */}
      <Pressable
        onPress={handleClaim}
        style={[
          styles.claimBadge,
          {
            backgroundColor: isMyClaim
              ? colors.accentPrimary + '22'
              : item.claimedBy
              ? colors.bgTertiary
              : 'transparent',
            borderRadius: radius.full,
            borderWidth:  isMyClaim ? 1 : item.claimedBy ? 1 : 0,
            borderColor:  isMyClaim ? colors.accentPrimary + '66' : colors.border,
            paddingHorizontal: 8,
            paddingVertical:   4,
          },
        ]}
        accessibilityLabel={isMyClaim ? 'Unclaim item' : 'Claim item'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {claiming ? (
          <ActivityIndicator size={10} color={colors.accentPrimary} />
        ) : item.claimedBy ? (
          <Text style={[text.label.sm, {
            color: isMyClaim ? colors.accentPrimary : colors.textSecondary,
            fontFamily: 'Outfit-Medium',
          }]}>
            {isMyClaim ? '● Me' : `● ${claimerName ?? '?'}`}
          </Text>
        ) : (
          <Text style={[text.label.sm, { color: colors.textMuted }]}>claim</Text>
        )}
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           12,
  },
  checkbox: {
    width:           22,
    height:          22,
    borderWidth:     2,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       1,
    flexShrink:      0,
  },
  content: {
    flex:      1,
    flexShrink: 1,
  },
  claimBadge: {
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       48,
  },
})
