// src/lib/firebase/groupSettings.ts
// All settings/admin Firestore operations.
// No screen may talk to Firestore directly.

import {
  updateDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import { groupsCol, inviteDoc, userDoc } from './collections'
import { captureError } from '@lib/sentry'
import { track } from '@lib/analytics'
import { generateDayPlans } from '@lib/utils/generateDayPlans'

// Unique invite code generator
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export interface UpdateGroupMetaParams {
  groupId:      string
  actorUid:     string
  name?:        string
  destination?: string
  startDate?:   string
  endDate?:     string
  totalBudget?: number
  description?: string
  coverPhotoUrl?: string
}

export interface TransferAdminParams {
  groupId:   string
  actorUid:  string
  targetUid: string
}

export interface RemoveMemberParams {
  groupId:   string
  actorUid:  string
  targetUid: string
}

export interface CompleteGroupParams {
  groupId:  string
  actorUid: string
}

export interface DissolveGroupParams {
  groupId:  string
  actorUid: string
}

// ── Update Group Meta ────────────────────────────────────────────────────────
export async function updateGroupMeta(params: UpdateGroupMetaParams): Promise<void> {
  const { groupId, actorUid, ...fields } = params
  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Group not found.')

    const group = snap.data() as any
    if (!group.adminIds?.includes(actorUid)) {
      throw new Error('You need admin access to do that.')
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim()
      if (trimmed.length < 2 || trimmed.length > 50) {
        throw new Error('Group name must be 2–50 characters.')
      }
      fields.name = trimmed
    }

    const updates: Record<string, any> = {
      ...fields,
      updatedAt: serverTimestamp(),
    }

    // Clean undefined fields
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k])

    await updateDoc(ref, updates)
    track('group_meta_updated', { groupId, fields: Object.keys(fields).join(',') })

    // If dates changed, scaffold day plans
    const newStart = fields.startDate !== undefined ? fields.startDate : group.startDate
    const newEnd   = fields.endDate !== undefined ? fields.endDate : group.endDate
    if ((fields.startDate !== undefined || fields.endDate !== undefined) && newStart && newEnd) {
      await generateDayPlans(groupId, newStart, newEnd, group.coverEmoji || '📅')
    }
  } catch (err) {
    captureError(err, { source: 'updateGroupMeta', groupId })
    throw err
  }
}

// ── Transfer Primary Admin ───────────────────────────────────────────────────
export async function transferPrimaryAdmin(params: TransferAdminParams): Promise<void> {
  const { groupId, actorUid, targetUid } = params
  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Group not found.')

    const group = snap.data() as any
    if (!group.adminIds?.includes(actorUid)) {
      throw new Error('You need admin access to do that.')
    }
    if (!group.memberIds?.includes(targetUid)) {
      throw new Error('Target user is not a member of this group.')
    }

    await updateDoc(ref, {
      adminIds:  arrayUnion(targetUid),
      updatedAt: serverTimestamp(),
    })

    track('group_admin_transferred', { groupId })
  } catch (err) {
    captureError(err, { source: 'transferPrimaryAdmin', groupId, targetUid })
    throw err
  }
}

// ── Remove Member From Group ─────────────────────────────────────────────────
export async function removeMemberFromGroup(params: RemoveMemberParams): Promise<void> {
  const { groupId, actorUid, targetUid } = params
  if (actorUid === targetUid) {
    throw new Error('Cannot remove yourself. Use leave flow instead.')
  }

  try {
    const ref = doc(groupsCol(), groupId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')

      const group = snap.data() as any
      if (!group.adminIds?.includes(actorUid)) {
        throw new Error('You need admin access to do that.')
      }
      if (!group.memberIds?.includes(targetUid)) {
        throw new Error('This person is not a member of the group.')
      }
      if (group.createdBy === targetUid) {
        throw new Error('This member cannot be removed.')
      }
      if (group.adminIds?.includes(targetUid) && group.adminIds.length === 1) {
        throw new Error('Cannot remove the last admin. Transfer admin role first.')
      }

      tx.update(ref, {
        memberIds: arrayRemove(targetUid),
        adminIds:  arrayRemove(targetUid),
        updatedAt: serverTimestamp(),
      })

      tx.update(userDoc(targetUid), {
        groups: arrayRemove(groupId),
      })
    })

    track('group_member_removed', { groupId })
  } catch (err) {
    captureError(err, { source: 'removeMemberFromGroup', groupId, targetUid })
    throw err
  }
}

// ── Leave Group Safely ───────────────────────────────────────────────────────
export async function leaveGroupSafely(groupId: string, uid: string): Promise<void> {
  try {
    const ref = doc(groupsCol(), groupId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')

      const group = snap.data() as any
      const isAdmin     = group.adminIds?.includes(uid) ?? false
      const adminCount  = group.adminIds?.length ?? 0
      const memberCount = group.memberIds?.length ?? 0

      if (group.createdBy === uid) {
        throw new Error('You created this group. Transfer admin or dissolve the group before leaving.')
      }
      if (isAdmin && adminCount === 1 && memberCount > 1) {
        throw new Error('Transfer admin to another member before leaving.')
      }

      tx.update(ref, {
        memberIds: arrayRemove(uid),
        adminIds:  arrayRemove(uid),
        updatedAt: serverTimestamp(),
      })

      tx.update(userDoc(uid), {
        groups: arrayRemove(groupId),
      })
    })

    track('group_left', { groupId })
  } catch (err) {
    captureError(err, { source: 'leaveGroupSafely', groupId })
    throw err
  }
}

// ── Regenerate Invite For Group ──────────────────────────────────────────────
export async function regenerateInviteForGroup(
  groupId:  string,
  actorUid: string,
  oldCode:  string,
): Promise<string> {
  try {
    const ref = doc(groupsCol(), groupId)
    let newCode = ''

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')

      const group = snap.data() as any
      if (!group.adminIds?.includes(actorUid)) {
        throw new Error('You need admin access to do that.')
      }

      // Generate unique new invite code
      let uniqueCode = ''
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode()
        const inviteSnap = await tx.get(inviteDoc(code))
        if (!inviteSnap.exists()) {
          uniqueCode = code
          break
        }
      }

      if (!uniqueCode) {
        throw new Error('Could not regenerate invite code. Please try again.')
      }

      newCode = uniqueCode

      // Delete old invite
      if (oldCode) {
        tx.delete(inviteDoc(oldCode))
      } else if (group.inviteCode) {
        tx.delete(inviteDoc(group.inviteCode))
      }

      // Set new invite doc
      tx.set(inviteDoc(newCode), {
        groupId,
        createdBy: actorUid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)), // 72 hours
        maxUses:   50,
        useCount:  0,
      })

      // Update group doc
      tx.update(ref, {
        inviteCode:          newCode,
        inviteCodeUpdatedAt: serverTimestamp(),
        updatedAt:           serverTimestamp(),
      })
    })

    track('group_invite_regenerated', { groupId })
    return newCode
  } catch (err) {
    captureError(err, { source: 'regenerateInviteForGroup', groupId })
    throw err
  }
}

// ── Complete Group ───────────────────────────────────────────────────────────
export async function completeGroup(params: CompleteGroupParams): Promise<void> {
  const { groupId, actorUid } = params
  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Group not found.')

    const group = snap.data() as any
    if (!group.adminIds?.includes(actorUid)) {
      throw new Error('You need admin access to do that.')
    }

    await updateDoc(ref, {
      status:      'completed',
      completedAt: serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })

    track('group_completed', { groupId })
  } catch (err) {
    captureError(err, { source: 'completeGroup', groupId })
    throw err
  }
}

// ── Dissolve Group ───────────────────────────────────────────────────────────
export async function dissolveGroup(params: DissolveGroupParams): Promise<void> {
  const { groupId, actorUid } = params
  try {
    const ref = doc(groupsCol(), groupId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')

      const group = snap.data() as any
      if (group.createdBy !== actorUid) {
        throw new Error('You need admin access to do that.')
      }

      // Validate zero balances (dues are settled)
      const balances: Array<{ fromUid: string; toUid: string; amount: number }> =
        group.balances ?? []
      const hasUnresolved = balances.some((b) => Math.abs(b.amount) >= 1)
      if (hasUnresolved) {
        throw new Error('Settle all dues before dissolving the group.')
      }

      const memberIds: string[] = group.memberIds ?? []
      const inviteCode = group.inviteCode

      // Update group doc status and clear lists
      tx.update(ref, {
        status:      'completed',
        memberIds:   [],
        adminIds:    [],
        dissolvedAt: serverTimestamp(),
        dissolvedBy: actorUid,
        updatedAt:   serverTimestamp(),
      })

      // Delete invite
      if (inviteCode) {
        tx.delete(inviteDoc(inviteCode))
      }

      // Remove group from all members
      for (const uid of memberIds) {
        tx.update(userDoc(uid), {
          groups: arrayRemove(groupId),
        })
      }
    })

    track('group_dissolved', { groupId })
  } catch (err) {
    captureError(err, { source: 'dissolveGroup', groupId })
    throw err
  }
}
