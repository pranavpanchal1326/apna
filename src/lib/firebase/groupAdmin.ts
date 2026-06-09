// src/lib/firebase/groupAdmin.ts
// Admin-only group mutation operations.
// SECURITY MODEL:
//   - Client validates adminIds before calling — fast fail, good UX
//   - Firestore security rules reject non-admin writes server-side
//   - Never trust client-side check alone — rules are the real guard
//
// All mutations use updateDoc (never deleteDoc) — soft delete only.
// Invite code regeneration uses a transaction — old code invalidated atomically.

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
import { captureError } from '../sentry'
import { track } from '../analytics'
import { generateDayPlans } from '../utils/generateDayPlans'

// ── Types ─────────────────────────────────────────────────────────────

export interface GroupEditParams {
  name?:        string
  coverEmoji?:  string
  destination?: string
  startDate?:   string
  endDate?:     string
  currency?:    string
}

// Helper function to generate a 6-character unique invite code matching Zod regex
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// ── Edit group details ─────────────────────────────────────────────

export async function editGroupDetails(
  groupId: string,
  adminUid: string,
  params: GroupEditParams,
): Promise<void> {
  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)

    if (!snap.exists()) throw new Error('Group not found.')
    const group = snap.data() as any
    if (!group.adminIds?.includes(adminUid)) {
      throw new Error('Only admins can edit group details.')
    }

    // Validate name length
    if (params.name !== undefined) {
      const trimmed = params.name.trim()
      if (trimmed.length < 2 || trimmed.length > 50) {
        throw new Error('Group name must be 2–50 characters.')
      }
      params.name = trimmed
    }

    const updates: Record<string, any> = {
      ...params,
      updatedAt: serverTimestamp(),
    }

    // Remove undefined keys — don't overwrite with undefined
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k])

    await updateDoc(ref, updates)
    track('group_edited', { groupId, fields: Object.keys(params).join(',') })

    // Generate day plans scaffolding if dates changed
    const newStartDate = params.startDate !== undefined ? params.startDate : group.startDate
    const newEndDate = params.endDate !== undefined ? params.endDate : group.endDate
    const currentEmoji = params.coverEmoji !== undefined ? params.coverEmoji : group.coverEmoji

    if (
      (params.startDate !== undefined || params.endDate !== undefined) &&
      newStartDate &&
      newEndDate
    ) {
      await generateDayPlans(groupId, newStartDate, newEndDate, currentEmoji || '📅')
    }
  } catch (err) {
    captureError(err, { source: 'editGroupDetails', groupId })
    throw err
  }
}

// ── Regenerate invite code ─────────────────────────────────────────
// Uses a transaction to atomically swap old code for new.
// Old code becomes invalid immediately — no race window.

export async function regenerateInviteCode(
  groupId: string,
  adminUid: string,
): Promise<string> {
  try {
    const ref = doc(groupsCol(), groupId)
    let newCode = ''

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')
      const group = snap.data() as any
      if (!group.adminIds?.includes(adminUid)) {
        throw new Error('Only admins can regenerate the invite code.')
      }

      const oldCode = group.inviteCode

      // Find a unique new code
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
        throw new Error('Could not generate unique invite code. Please try again.')
      }

      newCode = uniqueCode

      // Delete old invite
      if (oldCode) {
        tx.delete(inviteDoc(oldCode))
      }

      // Create new invite
      tx.set(inviteDoc(newCode), {
        groupId,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + 72 * 60 * 60 * 1000) // 72-hour TTL
        ),
        maxUses: 50,
        useCount: 0,
      })

      // Update group
      tx.update(ref, {
        inviteCode: newCode,
        inviteCodeUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    track('invite_regenerated', { groupId })
    return newCode
  } catch (err) {
    captureError(err, { source: 'regenerateInviteCode', groupId })
    throw err
  }
}

// ── Remove member from group ───────────────────────────────────────
// Removes uid from memberIds and (if applicable) adminIds.
// Does NOT delete their expenses — financial history stays intact.
// Also updates their user document groups array.

export async function removeMember(
  groupId: string,
  adminUid: string,
  targetUid: string,
): Promise<void> {
  if (adminUid === targetUid) {
    throw new Error('Cannot remove yourself. Use "Leave group" instead.')
  }

  try {
    const ref = doc(groupsCol(), groupId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')
      const group = snap.data() as any

      if (!group.adminIds?.includes(adminUid)) {
        throw new Error('Only admins can remove members.')
      }
      if (!group.memberIds?.includes(targetUid)) {
        throw new Error('This person is not a member of the group.')
      }
      // Guard: do not allow removing the last admin if they are a member
      if (
        group.adminIds?.includes(targetUid) &&
        group.adminIds.length === 1
      ) {
        throw new Error('Cannot remove the last admin. Transfer admin role first.')
      }

      tx.update(ref, {
        memberIds: arrayRemove(targetUid),
        adminIds:  arrayRemove(targetUid),  // No-op if not admin
        updatedAt: serverTimestamp(),
      })

      tx.update(userDoc(targetUid), {
        groups: arrayRemove(groupId),
      })
    })

    track('member_removed', { groupId })
  } catch (err) {
    captureError(err, { source: 'removeMember', groupId, targetUid })
    throw err
  }
}

// ── Transfer admin role ────────────────────────────────────────────
// Promotes targetUid to admin. Does NOT remove current admin.
// Admin role can be held by multiple members simultaneously.

export async function transferAdminRole(
  groupId: string,
  adminUid: string,
  targetUid: string,
): Promise<void> {
  if (adminUid === targetUid) {
    throw new Error('You are already an admin.')
  }

  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Group not found.')
    const group = snap.data() as any

    if (!group.adminIds?.includes(adminUid)) {
      throw new Error('Only admins can promote other members.')
    }
    if (!group.memberIds?.includes(targetUid)) {
      throw new Error('Target user is not a member of this group.')
    }

    await updateDoc(ref, {
      adminIds:  arrayUnion(targetUid),
      updatedAt: serverTimestamp(),
    })

    track('admin_transferred', { groupId })
  } catch (err) {
    captureError(err, { source: 'transferAdminRole', groupId, targetUid })
    throw err
  }
}

// ── Leave group ────────────────────────────────────────────────────
// Removes current user from memberIds and adminIds.
// GUARD: Last admin cannot leave — must transfer role first.
// GUARD: If only member left, they must delete group instead.

export async function leaveGroup(
  groupId: string,
  uid: string,
): Promise<void> {
  try {
    const ref = doc(groupsCol(), groupId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Group not found.')
      const group = snap.data() as any

      const isAdmin       = group.adminIds?.includes(uid) ?? false
      const adminCount    = group.adminIds?.length ?? 0
      const memberCount   = group.memberIds?.length ?? 0
      const isLastAdmin   = isAdmin && adminCount === 1
      const isLastMember  = memberCount === 1

      if (isLastMember) {
        throw new Error(
          'You are the last member. Delete the group instead of leaving.'
        )
      }
      if (isLastAdmin) {
        throw new Error(
          'You are the only admin. Transfer admin role to another member before leaving.'
        )
      }

      tx.update(ref, {
        memberIds: arrayRemove(uid),
        adminIds:  arrayRemove(uid),  // No-op if not admin
        updatedAt: serverTimestamp(),
      })

      tx.update(userDoc(uid), {
        groups: arrayRemove(groupId),
      })
    })

    track('group_left', { groupId })
  } catch (err) {
    captureError(err, { source: 'leaveGroup', groupId })
    throw err
  }
}

// ── Soft-delete group (archive) ────────────────────────────────────
// Sets status: 'archived'. Does NOT call deleteDoc.
// Data retained for 90 days.
// Only callable by an admin.

export async function archiveGroup(
  groupId: string,
  adminUid: string,
): Promise<void> {
  try {
    const ref = doc(groupsCol(), groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Group not found.')
    const group = snap.data() as any

    if (!group.adminIds?.includes(adminUid)) {
      throw new Error('Only admins can delete the group.')
    }

    await updateDoc(ref, {
      status:     'archived',
      archivedAt: serverTimestamp(),
      archivedBy: adminUid,
      updatedAt:  serverTimestamp(),
    })

    track('group_archived', { groupId })
  } catch (err) {
    captureError(err, { source: 'archiveGroup', groupId })
    throw err
  }
}
