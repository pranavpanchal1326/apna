// src/hooks/useGroupSettings.ts
// Screen-level settings hook.

import { useCallback, useMemo } from 'react'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import {
  updateGroupMeta,
  transferPrimaryAdmin,
  removeMemberFromGroup,
  leaveGroupSafely,
  regenerateInviteForGroup,
  completeGroup,
  dissolveGroup,
  UpdateGroupMetaParams,
} from '@lib/firebase/groupSettings'

export function useGroupSettings(groupId: string) {
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const group = activeGroup?.id === groupId ? activeGroup : null
  const { user } = useAuth()
  const myUid = user?.uid ?? ''

  const memberIds = useMemo(() => group?.memberIds ?? [], [group?.memberIds])
  const { members, isLoading: membersLoading } = useGroupMembers(memberIds)

  const isAdmin   = useMemo(() => group?.adminIds?.includes(myUid) ?? false, [group?.adminIds, myUid])
  const isCreator = useMemo(() => group?.createdBy === myUid, [group?.createdBy, myUid])
  const inviteCode = group?.inviteCode ?? ''

  const onUpdateMeta = useCallback(
    async (params: Omit<UpdateGroupMetaParams, 'groupId' | 'actorUid'>) => {
      return updateGroupMeta({ groupId, actorUid: myUid, ...params })
    },
    [groupId, myUid]
  )

  const onTransferAdmin = useCallback(
    async (targetUid: string) => {
      return transferPrimaryAdmin({ groupId, actorUid: myUid, targetUid })
    },
    [groupId, myUid]
  )

  const onRemoveMember = useCallback(
    async (targetUid: string) => {
      return removeMemberFromGroup({ groupId, actorUid: myUid, targetUid })
    },
    [groupId, myUid]
  )

  const onLeaveGroup = useCallback(async () => {
    return leaveGroupSafely(groupId, myUid)
  }, [groupId, myUid])

  const onRegenerateInvite = useCallback(
    async (oldCode: string) => {
      return regenerateInviteForGroup(groupId, myUid, oldCode)
    },
    [groupId, myUid]
  )

  const onCompleteGroup = useCallback(async () => {
    return completeGroup({ groupId, actorUid: myUid })
  }, [groupId, myUid])

  const onDissolveGroup = useCallback(async () => {
    return dissolveGroup({ groupId, actorUid: myUid })
  }, [groupId, myUid])

  return {
    group,
    members,
    membersLoading,
    isAdmin,
    isCreator,
    inviteCode,
    onUpdateMeta,
    onTransferAdmin,
    onRemoveMember,
    onLeaveGroup,
    onRegenerateInvite,
    onCompleteGroup,
    onDissolveGroup,
  }
}
