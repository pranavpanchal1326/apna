// src/screens/settings/GroupSettingsScreen.tsx
// Full group settings screen.
//
// Sections (top to bottom):
// 1. Group details (edit form — editable for admin, read-only for members)
// 2. Invite code (copy + regenerate — admin only)
// 3. Members (full list with admin actions)
// 4. Danger zone (leave / delete)
//
// Navigated to via gear icon (⚙) in GroupHomeScreen header.

import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import * as Clipboard from 'expo-clipboard'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@theme'
import { Screen } from '@components'
import {
  MemberManageRow,
  DangerZoneSection,
  GroupEditForm,
} from '@components/settings'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import {
  editGroupDetails,
  regenerateInviteCode,
  removeMember,
  transferAdminRole,
  leaveGroup,
  archiveGroup,
} from '@lib/firebase/groupAdmin'
import type { HomeStackScreenProps } from '@navigation/types'
import type { GroupEditParams } from '@lib/firebase/groupAdmin'

type Props = HomeStackScreenProps<'GroupSettings'>

export function GroupSettingsScreen({ route }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, radius, shadows } = useTheme()
  const navigation = useNavigation()
  const { user } = useAuth()
  const activeGroup = useGroupStore(s => s.activeGroup)
  const group = activeGroup?.id === groupId ? activeGroup : null
  const { members } = useGroupMembers(group?.memberIds ?? [])

  const myUid      = user?.uid ?? ''
  const isAdmin    = group?.adminIds?.includes(myUid) ?? false
  const adminCount = group?.adminIds?.length ?? 0

  const [inviteCodeState, setInviteCodeState] = useState<string>(group?.inviteCode ?? '')
  const [regenLoading,    setRegenLoading]    = useState(false)

  // ── Handlers ────────────────────────────────────────────────────

  const handleSaveDetails = useCallback(async (params: GroupEditParams) => {
    if (!group) return
    await editGroupDetails(group.id, myUid, params)
    // Group store will update via real-time subscription (useActiveGroup)
  }, [group, myUid])

  const handleCopyCode = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const code = inviteCodeState || group?.inviteCode || ''
    if (code) {
      await Clipboard.setStringAsync(code)
      Alert.alert('Copied!', 'Invite code copied to clipboard.')
    }
  }, [inviteCodeState, group?.inviteCode])

  const handleRegenCode = useCallback(() => {
    Alert.alert(
      'Regenerate invite code?',
      'The current code will stop working immediately. Anyone who has not joined yet will need the new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            if (!group) return
            setRegenLoading(true)
            try {
              const newCode = await regenerateInviteCode(group.id, myUid)
              setInviteCodeState(newCode)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to regenerate.')
            } finally {
              setRegenLoading(false)
            }
          },
        },
      ],
    )
  }, [group, myUid])

  const handleRemoveMember = useCallback(async (targetUid: string) => {
    if (!group) return
    try {
      await removeMember(group.id, myUid, targetUid)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member.')
      throw err
    }
  }, [group, myUid])

  const handleMakeAdmin = useCallback(async (targetUid: string) => {
    if (!group) return
    try {
      await transferAdminRole(group.id, myUid, targetUid)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to transfer admin role.')
      throw err
    }
  }, [group, myUid])

  const handleLeave = useCallback(async () => {
    if (!group) return
    try {
      await leaveGroup(group.id, myUid)
      navigation.reset({ index: 0, routes: [{ name: 'HomeList' as any }] })
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not leave group.')
    }
  }, [group, myUid, navigation])

  const handleDelete = useCallback(async () => {
    if (!group) return
    try {
      await archiveGroup(group.id, myUid)
      navigation.reset({ index: 0, routes: [{ name: 'HomeList' as any }] })
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete group.')
    }
  }, [group, myUid, navigation])

  if (!group) {
    return (
      <Screen>
        <Text style={[text.body.md, { color: colors.textMuted, textAlign: 'center', marginTop: 40 }]}>
          Group not found.
        </Text>
      </Screen>
    )
  }

  const currentCode = inviteCodeState || group.inviteCode || ''

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        marginBottom: spacing.lg,
      }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: colors.accentPrimary, fontSize: 22 }}>‹</Text>
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
          Settings
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section: Group Details ── */}
        <Text style={[
          text.label.md,
          { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 },
        ]}>
          GROUP DETAILS
        </Text>
        <View style={[
          styles.card,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.lg,
            borderColor: colors.border,
            borderWidth: 1,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            ...shadows.card,
          },
        ]}>
          <GroupEditForm
            group={group}
            isAdmin={isAdmin}
            onSave={handleSaveDetails}
          />
        </View>

        {/* ── Section: Invite Code ── */}
        <Text style={[
          text.label.md,
          { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 },
        ]}>
          INVITE CODE
        </Text>
        <View style={[
          styles.card,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.lg,
            borderColor: colors.borderAccent,
            borderWidth: 1,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            ...shadows.card,
          },
        ]}>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Share this code to invite people to the group.
          </Text>

          {/* Code display + copy */}
          <Pressable
            onPress={handleCopyCode}
            style={[
              styles.codeRow,
              {
                backgroundColor: colors.bgTertiary,
                borderRadius: radius.md,
                borderColor: colors.borderAccent,
                borderWidth: 1,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                marginBottom: spacing.md,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Invite code ${currentCode}, tap to copy`}
          >
            <Text style={[
              text.mono.lg,
              { color: colors.accentPrimary, letterSpacing: 4 },
            ]}>
              {currentCode}
            </Text>
            <Text style={[text.label.md, { color: colors.textMuted }]}>
              Copy ↗
            </Text>
          </Pressable>

          {/* Regenerate — admin only */}
          {isAdmin && (
            <Pressable
              onPress={handleRegenCode}
              disabled={regenLoading}
              style={{ alignItems: 'center', opacity: regenLoading ? 0.5 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Regenerate invite code"
            >
              <Text style={[text.label.md, { color: colors.accentDanger }]}>
                {regenLoading ? 'Regenerating…' : '↻ Regenerate Code'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Section: Members ── */}
        <Text style={[
          text.label.md,
          { color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.5 },
        ]}>
          MEMBERS ({group.memberIds.length})
        </Text>
        <View style={[
          styles.card,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.lg,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.xl,
            ...shadows.card,
          },
        ]}>
          {group.memberIds.map(uid => {
            const member = members.get(uid)
            if (!member) return null
            const isMemberAdmin = group.adminIds?.includes(uid) ?? false
            const isLastAdminUid = isMemberAdmin && adminCount === 1
            return (
              <MemberManageRow
                key={uid}
                user={member}
                isMe={uid === myUid}
                isAdmin={isMemberAdmin}
                viewerIsAdmin={isAdmin}
                isLastAdmin={isLastAdminUid}
                onRemove={handleRemoveMember}
                onMakeAdmin={handleMakeAdmin}
              />
            )
          })}
        </View>

        {/* ── Section: Danger Zone ── */}
        <DangerZoneSection
          groupName={group.name}
          isAdmin={isAdmin}
          isLastAdmin={isAdmin && adminCount === 1}
          memberCount={group.memberIds.length}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  card:    {},
  codeRow: { flexDirection: 'row' },
})
