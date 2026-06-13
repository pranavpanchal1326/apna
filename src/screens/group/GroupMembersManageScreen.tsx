import { useCallback, useMemo } from 'react'
import { View, Text, FlatList, StyleSheet, Alert, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, Header } from '@components'
import { MemberRoleRow } from '@components/group/MemberRoleRow'
import { useGroupSettings } from '@hooks/useGroupSettings'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'GroupMembersManage'>

export function GroupMembersManageScreen({ route, navigation }: Props) {
  const { groupId } = route.params
  const { colors, spacing, text } = useTheme()
  const { user } = useAuth()
  const myUid = user?.uid ?? ''

  const {
    group,
    members,
    isAdmin: viewerIsAdmin,
    onTransferAdmin,
    onRemoveMember,
  } = useGroupSettings(groupId)

  const adminIds = useMemo(() => group?.adminIds ?? [], [group?.adminIds])
  const creatorUid = group?.createdBy ?? ''

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
              phone={member.phone}
              avatarColor={member.avatarColor}
              photoURL={member.photoUrl}
              isAdmin={isMemberAdmin}
              isSelf={memberUid === myUid}
              isCreator={isCreator}
              canManage={viewerIsAdmin}
              onTransferAdmin={() => handleTransfer(memberUid, member.name)}
              onRemove={() => handleRemove(memberUid, member.name)}
            />
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
