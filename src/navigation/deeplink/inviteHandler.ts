// src/navigation/deeplink/inviteHandler.ts
import { getDoc, Timestamp } from 'firebase/firestore'
import { inviteDoc, groupDoc } from '@lib/firebase/collections'
import type { GroupInput } from '@lib/schemas'

export interface InvitePreviewResult {
  valid: boolean
  group?: GroupInput
  invite?: {
    groupId: string
    code: string
    expiresAt: any
    useCount: number
    maxUses: number
  }
  error?: string
}

const INVITE_CODE_RE = /^[A-Z0-9]{6}$/

export function checkInviteCodeFormat(code: string): string | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return INVITE_CODE_RE.test(normalized) ? normalized : null
}

export async function validateGroupInvite(inviteCode: string, currentUid?: string | null): Promise<InvitePreviewResult> {
  const normalizedCode = checkInviteCodeFormat(inviteCode)
  if (!normalizedCode) {
    return { valid: false, error: 'Invalid invite code. Check and try again.' }
  }

  try {
    const inviteSnap = await getDoc(inviteDoc(normalizedCode))
    if (!inviteSnap.exists()) {
      return { valid: false, error: 'Invalid invite code. Check and try again.' }
    }

    const invite = inviteSnap.data() as any
    const now = Timestamp.now()

    if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
      return { valid: false, error: 'This invite code has expired.' }
    }

    if (invite.useCount >= invite.maxUses) {
      return { valid: false, error: 'This invite code has reached its use limit.' }
    }

    const groupSnap = await getDoc(groupDoc(invite.groupId))
    if (!groupSnap.exists()) {
      return { valid: false, error: 'The group associated with this invite no longer exists.' }
    }

    const group = groupSnap.data() as GroupInput
    if (currentUid && group.memberIds?.includes(currentUid)) {
      return { valid: false, group, invite: { ...invite, code: normalizedCode }, error: 'You are already a member of this group.' }
    }

    return {
      valid: true,
      group,
      invite: {
        groupId: invite.groupId,
        code: normalizedCode,
        expiresAt: invite.expiresAt,
        useCount: invite.useCount,
        maxUses: invite.maxUses,
      }
    }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to verify invite code.'
    }
  }
}
