// src/components/settings/MemberManageRow.tsx
// Single member row in the settings Members section.
// Admin sees: remove button + "Make admin" option.
// Non-admin sees: read-only row (no actions).
// Current user row: shows (you) label, no actions on self.

import { memo, useCallback, useState } from 'react'
import {
  View, Text, Pressable, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { UserInput } from '@lib/schemas'

interface Props {
  user:          UserInput
  isMe:          boolean
  isAdmin:       boolean      // Is this user an admin?
  viewerIsAdmin: boolean      // Is the viewing user an admin?
  isLastAdmin:   boolean      // Is this user the only admin?
  onRemove:      (uid: string) => Promise<void>
  onMakeAdmin:   (uid: string) => Promise<void>
}

export const MemberManageRow = memo(function MemberManageRow({
  user,
  isMe,
  isAdmin,
  viewerIsAdmin,
  isLastAdmin,
  onRemove,
  onMakeAdmin,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [loading, setLoading] = useState<'remove' | 'admin' | null>(null)

  const handleRemove = useCallback(() => {
    const firstName = user.name.split(' ')[0]
    Alert.alert(
      `Remove ${firstName}?`,
      `${user.name} will be removed from the group. Their expenses will remain. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            setLoading('remove')
            try {
              await onRemove(user.uid)
            } catch (err) {
              // Error handled by parent or showing alert
            } finally {
              setLoading(null)
            }
          },
        },
      ],
    )
  }, [user, onRemove])

  const handleMakeAdmin = useCallback(() => {
    const firstName = user.name.split(' ')[0]
    Alert.alert(
      `Make ${firstName} an admin?`,
      `${user.name} will be able to edit the group, remove members, and regenerate the invite code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Admin',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            setLoading('admin')
            try {
              await onMakeAdmin(user.uid)
            } catch (err) {
              // Error handled by parent
            } finally {
              setLoading(null)
            }
          },
        },
      ],
    )
  }, [user, onMakeAdmin])

  return (
    <View style={[
      styles.row,
      {
        paddingVertical:  spacing.md,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      },
    ]}>
      <Avatar
        name={user.name}
        color={user.avatarColor}
        imageUrl={user.photoUrl}
        size="md"
      />

      <View style={[styles.info, { marginLeft: spacing.sm, flex: 1 }]}>
        <View style={styles.nameRow}>
          <Text
            style={[text.body.md, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {user.name}{isMe ? ' (you)' : ''}
          </Text>
          {isAdmin && (
            <View style={[
              styles.badge,
              {
                backgroundColor: colors.accentGold + '25',
                borderRadius: radius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                marginLeft: spacing.xs,
              },
            ]}>
              <Text style={[text.label.sm, { color: colors.accentGold }]}>
                admin
              </Text>
            </View>
          )}
        </View>
        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
          {user.phone}
        </Text>
      </View>

      {/* Actions — only for admin viewing non-self members */}
      {viewerIsAdmin && !isMe && (
        <View style={styles.actions}>
          {/* Make admin — only if not already admin */}
          {!isAdmin && (
            <Pressable
              onPress={handleMakeAdmin}
              disabled={loading !== null}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.bgTertiary,
                  borderRadius: radius.sm,
                  borderColor: colors.border,
                  borderWidth: 1,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  marginRight: spacing.xs,
                  minHeight: 32,
                  justifyContent: 'center',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Make ${user.name} an admin`}
            >
              {loading === 'admin' ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>
                  Admin
                </Text>
              )}
            </Pressable>
          )}

          {/* Remove — disabled if last admin */}
          {!(isAdmin && isLastAdmin) && (
            <Pressable
              onPress={handleRemove}
              disabled={loading !== null}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.accentDanger + '15',
                  borderRadius: radius.sm,
                  borderColor: colors.accentDanger + '40',
                  borderWidth: 1,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  minHeight: 32,
                  justifyContent: 'center',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${user.name} from group`}
            >
              {loading === 'remove' ? (
                <ActivityIndicator size="small" color={colors.accentDanger} />
              ) : (
                <Text style={[text.label.sm, { color: colors.accentDanger }]}>
                  Remove
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center' },
  info:      { justifyContent: 'center' },
  nameRow:   { flexDirection: 'row', alignItems: 'center' },
  badge:     {},
  actions:   { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {},
})
