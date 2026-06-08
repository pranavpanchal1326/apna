// src/components/group/MemberAvatarRow.tsx
// Horizontal scrollable row of member avatars.
// Shows first 6, then "+N more" overflow pill.
// Tapping an avatar opens MembersTab.

import { memo } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { UserInput } from '@lib/schemas'

interface Props {
  members:     Map<string, UserInput>
  memberIds:   string[]
  onPressAll?: () => void
  onPress?:    (uid: string) => void
}

const MAX_VISIBLE = 6

export const MemberAvatarRow = memo(function MemberAvatarRow({
  members,
  memberIds,
  onPressAll,
  onPress,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()

  const visibleIds  = memberIds.slice(0, MAX_VISIBLE)
  const overflowCount = memberIds.length - MAX_VISIBLE

  return (
    <View style={[styles.container, { marginBottom: spacing.xl }]}>
      <View style={styles.row}>
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {memberIds.length} {memberIds.length === 1 ? 'member' : 'members'}
        </Text>
        {onPressAll && (
          <Pressable
            onPress={onPressAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View all members"
          >
            <Text style={[text.label.md, { color: colors.accentPrimary }]}>
              View all →
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
      >
        {visibleIds.map((uid) => {
          const user = members.get(uid)
          if (!user) return null
          return (
            <Pressable
              key={uid}
              onPress={() => onPress?.(uid)}
              style={styles.avatarItem}
              accessibilityRole="button"
              accessibilityLabel={`${user.name}'s profile`}
            >
              <Avatar
                name={user.name}
                imageUrl={user.photoUrl}
                color={user.avatarColor ?? '#4ECDC4'}
                size="md"
              />
              <Text
                style={[
                  text.label.sm,
                  { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
                ]}
                numberOfLines={1}
              >
                {user.name.split(' ')[0]}
              </Text>
            </Pressable>
          )
        })}

        {/* Overflow pill */}
        {overflowCount > 0 && (
          <Pressable
            onPress={onPressAll}
            style={[
              styles.overflowPill,
              {
                backgroundColor: colors.bgTertiary,
                borderRadius:    radius.full,
                borderColor:     colors.border,
                borderWidth:     1,
                width:           44,
                height:          44,
                alignItems:      'center',
                justifyContent:  'center',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${overflowCount} more members`}
          >
            <Text style={[text.label.md, { color: colors.textSecondary }]}>
              +{overflowCount}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {},
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarItem: { alignItems: 'center', maxWidth: 52 },
  overflowPill: {},
})
