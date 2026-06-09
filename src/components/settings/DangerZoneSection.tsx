// src/components/settings/DangerZoneSection.tsx
// Danger zone — Leave group (all members) + Delete group (admin only).
// Every action has a two-step confirmation:
//   1. Alert.alert with warning text
//   2. Inline text input confirmation to match the group name (Android compatible)
//
// "Leave group" is NOT in a red zone for non-admin members
// — it's a normal action. Red zone is for Admin-only delete.

import { useState, useCallback } from 'react'
import { View, Text, Pressable, Alert, TextInput, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'

interface Props {
  groupName:    string
  isAdmin:      boolean
  isLastAdmin:  boolean
  memberCount:  number
  onLeave:      () => Promise<void>
  onDelete:     () => Promise<void>
}

export function DangerZoneSection({
  groupName,
  isAdmin,
  isLastAdmin,
  memberCount,
  onLeave,
  onDelete,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [loadingLeave,  setLoadingLeave]  = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [showConfirmInput, setShowConfirmInput] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  const handleLeave = useCallback(() => {
    if (isLastAdmin) {
      Alert.alert(
        'Transfer admin first',
        'You are the only admin. Make another member an admin before leaving.',
        [{ text: 'OK' }],
      )
      return
    }
    if (memberCount === 1) {
      Alert.alert(
        'You are the last member',
        'Delete the group instead of leaving.',
        [{ text: 'OK' }],
      )
      return
    }

    Alert.alert(
      'Leave group?',
      `You will be removed from "${groupName}". Your expenses will remain. You can rejoin with an invite code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Group',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            setLoadingLeave(true)
            try {
              await onLeave()
            } catch (err) {
              // Error handled by parent
            } finally {
              setLoadingLeave(false)
            }
          },
        },
      ],
    )
  }, [groupName, isLastAdmin, memberCount, onLeave])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete group?',
      `This will archive "${groupName}" for all ${memberCount} members. All expense and settlement history will be preserved for 90 days. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setShowConfirmInput(true)
          },
        },
      ],
    )
  }, [groupName, memberCount])

  return (
    <View style={{ marginTop: spacing['2xl'] }}>
      {/* Leave Group */}
      <View style={[
        styles.section,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
      ]}>
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 }]}>
          LEAVE GROUP
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          You'll be removed from the group. Your expenses remain and can't be deleted.
          {isLastAdmin ? '\n\n⚠ Transfer admin role before leaving.' : ''}
        </Text>
        <Pressable
          onPress={handleLeave}
          disabled={loadingLeave}
          style={[
            styles.btn,
            {
              borderColor: colors.accentDanger + '60',
              borderWidth: 1.5,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              alignItems: 'center',
              minHeight: 44,
              justifyContent: 'center',
              opacity: loadingLeave ? 0.6 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Leave group"
        >
          <Text style={[text.body.sm, { color: colors.accentDanger }]}>
            {loadingLeave ? 'Leaving…' : 'Leave Group'}
          </Text>
        </Pressable>
      </View>

      {/* Delete Group — admin only */}
      {isAdmin && (
        <View style={[
          styles.section,
          {
            backgroundColor: colors.accentDanger + '08',
            borderRadius: radius.lg,
            borderColor: colors.accentDanger + '30',
            borderWidth: 1.5,
            padding: spacing.lg,
          },
        ]}>
          <Text style={[text.label.md, { color: colors.accentDanger, marginBottom: spacing.sm, letterSpacing: 0.5 }]}>
            DANGER ZONE
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Deleting the group archives it for all members. All data is preserved for 90 days.
          </Text>

          {showConfirmInput ? (
            <View>
              <Text style={[text.body.sm, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                To confirm deletion, type <Text style={{ fontFamily: 'Outfit-Bold' }}>{groupName}</Text> below:
              </Text>
              <TextInput
                value={confirmName}
                onChangeText={setConfirmName}
                placeholder="Enter group name"
                placeholderTextColor={colors.textMuted}
                style={{
                  fontFamily: 'Outfit-Regular',
                  fontSize: 15,
                  color: colors.textPrimary,
                  backgroundColor: colors.bgTertiary,
                  borderColor: colors.accentDanger + '40',
                  borderWidth: 1,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: 44,
                  marginBottom: spacing.md,
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={() => {
                    setShowConfirmInput(false)
                    setConfirmName('')
                  }}
                  style={{
                    flex: 1,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                  }}
                >
                  <Text style={[text.body.sm, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (confirmName.trim() !== groupName.trim()) {
                      Alert.alert('Name does not match', 'Please type the exact group name.')
                      return
                    }
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    setLoadingDelete(true)
                    try {
                      await onDelete()
                    } catch (err) {
                      // Error handled by parent
                    } finally {
                      setLoadingDelete(false)
                    }
                  }}
                  disabled={loadingDelete || confirmName.trim() !== groupName.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: colors.accentDanger,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    opacity: confirmName.trim() !== groupName.trim() || loadingDelete ? 0.6 : 1,
                  }}
                >
                  <Text style={[text.body.sm, { color: '#FFFFFF', fontWeight: '600' }]}>
                    {loadingDelete ? 'Deleting…' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleDelete}
              disabled={loadingDelete}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.accentDanger,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm + 2,
                  alignItems: 'center',
                  minHeight: 44,
                  justifyContent: 'center',
                  opacity: loadingDelete ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete group permanently"
            >
              <Text style={[text.body.sm, { color: '#FFFFFF' }]}>
                {loadingDelete ? 'Deleting…' : 'Delete Group'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {},
  btn: {},
})
