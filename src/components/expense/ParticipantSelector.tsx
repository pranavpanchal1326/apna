// src/components/expense/ParticipantSelector.tsx
// Multi-select member toggle grid.
// Shows all group members. Tapping toggles inclusion in split.
// "Select all" / "Deselect all" header controls.
// Always shows the payer as selected (cannot deselect payer).

import { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { UserInput } from '@lib/schemas'

interface Props {
  members:      Map<string, UserInput>
  memberIds:    string[]
  selected:     Set<string>        // UIDs of selected participants
  paidByUid:    string             // Payer — always selected, cannot deselect
  onToggle:     (uid: string) => void
  onSelectAll:  () => void
  onDeselectAll: () => void
}

export const ParticipantSelector = memo(function ParticipantSelector({
  members,
  memberIds,
  selected,
  paidByUid,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const allSelected = selected.size === memberIds.length

  const handleToggle = useCallback((uid: string) => {
    if (uid === paidByUid) return  // Cannot deselect payer
    Haptics.selectionAsync()
    onToggle(uid)
  }, [paidByUid, onToggle])

  return (
    <View>
      {/* Header: label + select/deselect all */}
      <View style={[styles.header, { marginBottom: spacing.md }]}>
        <Text style={[text.label.md, { color: colors.textSecondary }]}>
          Split between ({selected.size})
        </Text>
        <Pressable
          onPress={allSelected ? onDeselectAll : onSelectAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={allSelected ? 'Deselect all members' : 'Select all members'}
        >
          <Text style={[text.label.md, { color: colors.accentPrimary }]}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Text>
        </Pressable>
      </View>

      {/* Member grid — 2 per row */}
      <View style={styles.grid}>
        {memberIds.map((uid) => {
          const user       = members.get(uid)
          const isSelected = selected.has(uid)
          const isPayer    = uid === paidByUid
          if (!user) return null

          return (
            <Pressable
              key={uid}
              onPress={() => handleToggle(uid)}
              style={[
                styles.memberTile,
                {
                  backgroundColor: isSelected
                    ? `${colors.accentPrimary}15`
                    : colors.bgTertiary,
                  borderRadius:    radius.lg,
                  borderWidth:     isSelected ? 1.5 : 1,
                  borderColor:     isSelected
                    ? colors.accentPrimary
                    : colors.border,
                  padding:         spacing.md,
                  margin:          spacing.xs,
                  flex:            1,
                  minWidth:        '45%',
                  minHeight:       80,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected, disabled: isPayer }}
              accessibilityLabel={`${user.name}${isPayer ? ' (payer)' : ''}`}
            >
              {/* Checkmark overlay */}
              {isSelected && (
                <View
                  style={[
                    styles.checkmark,
                    {
                      backgroundColor: colors.accentPrimary,
                      borderRadius:    radius.full,
                      width:           18,
                      height:          18,
                    },
                  ]}
                >
                  <Text style={{ color: colors.bgPrimary, fontSize: 10, fontWeight: '700' }}>
                    ✓
                  </Text>
                </View>
              )}

              <Avatar
                name={user.name}
                imageUrl={user.photoUrl}
                color={user.avatarColor}
                size="sm"
              />
              <Text
                style={[
                  text.label.md,
                  {
                    color:     isSelected ? colors.accentPrimary : colors.textSecondary,
                    marginTop: spacing.xs,
                    textAlign: 'center',
                  },
                ]}
                numberOfLines={1}
              >
                {user.name.split(' ')[0]}
              </Text>
              {isPayer && (
                <Text style={[text.label.sm, { color: colors.accentGold, marginTop: 2 }]}>
                  paid
                </Text>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  memberTile: { alignItems: 'center', position: 'relative', justifyContent: 'center' },
  checkmark:  {
    position:       'absolute',
    top:            8,
    right:          8,
    alignItems:     'center',
    justifyContent: 'center',
  },
})
