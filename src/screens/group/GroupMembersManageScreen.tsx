import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Alert, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, Header, Button } from '@components'
import { MemberRoleRow } from '@components/group/MemberRoleRow'
import { useGroupSettings } from '@hooks/useGroupSettings'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'GroupMembersManage'>

export function GroupMembersManageScreen({ route, navigation }: Props) {
  const { groupId } = route.params
  const { colors, spacing, text, radius } = useTheme()
  const { user } = useAuth()
  const myUid = user?.uid ?? ''

  const {
    group,
    members,
    isAdmin: viewerIsAdmin,
    onTransferAdmin,
    onDemoteAdmin,
    onSetNickname,
    onRemoveMember,
  } = useGroupSettings(groupId)

  const adminIds = useMemo(() => group?.adminIds ?? [], [group?.adminIds])
  const creatorUid = group?.createdBy ?? ''
  const viewerIsCreator = creatorUid === myUid

  // Nickname editor modal state
  const [nicknameTarget, setNicknameTarget] = useState<{ uid: string; name: string } | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [isSavingNickname, setIsSavingNickname] = useState(false)

  const openNicknameEditor = useCallback(
    (targetUid: string, targetName: string) => {
      setNicknameInput(group?.nicknames?.[targetUid] ?? '')
      setNicknameTarget({ uid: targetUid, name: targetName })
    },
    [group?.nicknames]
  )

  const handleSaveNickname = useCallback(async () => {
    if (!nicknameTarget) return
    setIsSavingNickname(true)
    try {
      await onSetNickname(nicknameTarget.uid, nicknameInput)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setNicknameTarget(null)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save nickname.')
    } finally {
      setIsSavingNickname(false)
    }
  }, [nicknameTarget, nicknameInput, onSetNickname])

  const handleDemote = useCallback(
    async (targetUid: string, targetName: string) => {
      Alert.alert(
        'Remove admin access?',
        `${targetName} will become a regular member.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Admin',
            style: 'destructive',
            onPress: async () => {
              try {
                await onDemoteAdmin(targetUid)
                Alert.alert('Done', `${targetName} is no longer an admin.`)
              } catch (err: any) {
                Alert.alert('Error', err.message ?? 'Failed to remove admin access.')
              }
            },
          },
        ]
      )
    },
    [onDemoteAdmin]
  )

  const handleTransfer = useCallback(
    async (targetUid: string, targetName: string) => {
      Alert.alert(
        'Make Admin?',
        `Are you sure you want to promote ${targetName} to an admin?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Promote',
            style: 'default',
            onPress: async () => {
              try {
                await onTransferAdmin(targetUid)
                Alert.alert('Success', `${targetName} is now an admin.`)
              } catch (err: any) {
                Alert.alert('Error', err.message ?? 'Failed to transfer admin.')
              }
            },
          },
        ]
      )
    },
    [onTransferAdmin]
  )

  const handleRemove = useCallback(
    async (targetUid: string, targetName: string) => {
      Alert.alert(
        'Remove Member?',
        `Are you sure you want to remove ${targetName} from the group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await onRemoveMember(targetUid)
                Alert.alert('Success', `${targetName} has been removed.`)
              } catch (err: any) {
                Alert.alert('Error', err.message ?? 'Failed to remove member.')
              }
            },
          },
        ]
      )
    },
    [onRemoveMember]
  )

  const listData = useMemo(() => {
    if (!group) return []
    return group.memberIds
  }, [group])

  if (!group) {
    return (
      <Screen>
        <Header title="Manage Members" showBack />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.textMuted }]}>Group not found.</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header
        title="Manage Members"
        showBack
        rightAction={
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              navigation.navigate('AddMembers', { groupId })
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Add members"
          >
            <Text style={{ color: colors.accentPrimary, fontSize: 24 }}>+</Text>
          </Pressable>
        }
      />
      <FlatList
        data={listData}
        keyExtractor={(item) => item}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item: memberUid }) => {
          const member = members.get(memberUid)
          if (!member) return null

          const isMemberAdmin = adminIds.includes(memberUid)
          const isCreator     = creatorUid === memberUid

          return (
            <MemberRoleRow
              uid={memberUid}
              name={member.name}
              nickname={group.nicknames?.[memberUid]}
              phone={member.phone}
              avatarColor={member.avatarColor}
              photoURL={member.photoUrl}
              isAdmin={isMemberAdmin}
              isSelf={memberUid === myUid}
              isCreator={isCreator}
              canManage={viewerIsAdmin}
              canDemote={viewerIsCreator}
              onTransferAdmin={() => handleTransfer(memberUid, member.name)}
              onDemoteAdmin={() => handleDemote(memberUid, member.name)}
              onEditNickname={() => openNicknameEditor(memberUid, member.name)}
              onRemove={() => handleRemove(memberUid, member.name)}
            />
          )
        }}
      />

      {/* Nickname editor */}
      <Modal
        visible={nicknameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNicknameTarget(null)} />
          <View
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.lg,
              marginHorizontal: spacing.xl,
              width: '85%',
            }}
          >
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
              Nickname for {nicknameTarget?.name}
            </Text>
            <Text style={[text.body.sm, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Only visible inside this group. Leave empty to remove.
            </Text>
            <TextInput
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="e.g. Chotu"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              autoFocus
              style={{
                color: colors.textPrimary,
                backgroundColor: colors.bgTertiary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 15,
                marginBottom: spacing.lg,
              }}
              accessibilityLabel={`Nickname for ${nicknameTarget?.name ?? 'member'}`}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  size="md"
                  label="Cancel"
                  fullWidth
                  onPress={() => setNicknameTarget(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  size="md"
                  label="Save"
                  fullWidth
                  loading={isSavingNickname}
                  disabled={isSavingNickname}
                  onPress={handleSaveNickname}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
})
