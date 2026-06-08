// src/lib/firebase/groups.ts
// All group-related Firestore operations.
// Called from stores and hooks — never directly from screens.
//
// Atomic operations use writeBatch() — group creation is a 3-document batch:
//   1. Create /groups/{groupId}
//   2. Create /invites/{inviteCode}
//   3. Update /users/{uid}.groups (array union)
//
// All operations validate with Zod before writing.

import {
  writeBatch,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import {
  groupsCol,
  groupDoc,
  inviteDoc,
  userDoc,
} from './collections'
import {
  GroupCreateSchema,
  GroupUpdateSchema,
  type GroupCreate,
  type GroupInput,
  type GroupUpdate,
} from '@lib/schemas'

// ── Invite code generation ────────────────────────────────────────
// 6 chars, uppercase alphanumeric, excluding ambiguous chars (0, O, I, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

/**
 * Check if an invite code is already taken in Firestore.
 * Retries up to 5 times to find a unique code.
 */
async function getUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    const snap = await getDoc(inviteDoc(code))
    if (!snap.exists()) return code
  }
  throw new Error('Could not generate unique invite code. Please try again.')
}

// ── CREATE GROUP ─────────────────────────────────────────────────
export interface CreateGroupParams {
  name:        string
  destination?: string
  startDate?:  string   // YYYY-MM-DD
  endDate?:    string
  coverEmoji?: string
  currency?:   string
  totalBudget?: number
  creatorUid:  string
}

export interface CreateGroupResult {
  groupId:    string
  inviteCode: string
}

export async function createGroup(
  params: CreateGroupParams
): Promise<CreateGroupResult> {
  const {
    name,
    destination,
    startDate,
    endDate,
    coverEmoji = '✈️',
    currency = 'INR',
    totalBudget,
    creatorUid,
  } = params

  // Generate IDs before batch
  const groupRef    = doc(groupsCol())
  const groupId     = groupRef.id
  const inviteCode  = await getUniqueInviteCode()
  const inviteRef   = inviteDoc(inviteCode)
  const creatorRef  = userDoc(creatorUid)

  // Build group data — validate before writing
  const groupData: GroupCreate = {
    name:       name.trim(),
    destination: destination?.trim(),
    startDate,
    endDate,
    coverEmoji,
    currency,
    totalBudget,
    memberIds:  [creatorUid],
    adminIds:   [creatorUid],
    createdBy:  creatorUid,
    createdAt:  serverTimestamp() as unknown as Timestamp,
    inviteCode,
    status:     'active',
  }

  // Validate with Zod (catches bad data before it hits Firestore)
  const validation = GroupCreateSchema.safeParse({
    ...groupData,
    createdAt: Timestamp.now(),   // Use real Timestamp for Zod validation
  })

  if (!validation.success) {
    throw new Error(`Invalid group data: ${validation.error.issues[0].message}`)
  }

  // ── Atomic batch write ────────────────────────────────────────
  // All 3 writes succeed together or all fail — no partial state
  const batch = writeBatch(db)

  // 1. Create group document
  batch.set(groupRef, groupData)

  // 2. Create invite document
  batch.set(inviteRef, {
    groupId,
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(
      new Date(Date.now() + 72 * 60 * 60 * 1000)   // 72-hour TTL
    ),
    maxUses:  50,
    useCount: 0,
  })

  // 3. Add groupId to creator's user.groups array
  batch.update(creatorRef, {
    groups: arrayUnion(groupId),
  })

  await batch.commit()

  return { groupId, inviteCode }
}

// ── JOIN GROUP VIA INVITE CODE ────────────────────────────────────
export interface JoinGroupResult {
  groupId:   string
  groupName: string
}

export async function joinGroupByCode(
  inviteCode: string,
  joinerUid:  string
): Promise<JoinGroupResult> {
  const code = inviteCode.trim().toUpperCase()

  // 1. Fetch and validate invite
  const inviteSnap = await getDoc(inviteDoc(code))

  if (!inviteSnap.exists()) {
    throw new Error('Invalid invite code. Check the code and try again.')
  }

  const invite = inviteSnap.data() as any

  // Check expiry
  const now = Timestamp.now()
  if (invite.expiresAt.toMillis() < now.toMillis()) {
    throw new Error('This invite has expired. Ask the group creator to share a fresh code.')
  }

  // Check max uses
  if (invite.useCount >= invite.maxUses) {
    throw new Error('This invite code has reached its limit. Ask for a new one.')
  }

  const { groupId } = invite

  // 2. Fetch group to check membership + get name
  const groupSnap = await getDoc(groupDoc(groupId))

  if (!groupSnap.exists()) {
    throw new Error('This group no longer exists.')
  }

  const group = groupSnap.data()

  // Already a member?
  if (group.memberIds.includes(joinerUid)) {
    return { groupId, groupName: group.name }  // Idempotent — no error
  }

  // Group member limit check
  if (group.memberIds.length >= 20) {
    throw new Error('This group is full (max 20 members).')
  }

  // 3. Atomic batch: add member to group + update user.groups + increment useCount
  const batch = writeBatch(db)

  batch.update(groupDoc(groupId), {
    memberIds: arrayUnion(joinerUid),
  })

  batch.update(userDoc(joinerUid), {
    groups: arrayUnion(groupId),
  })

  batch.update(inviteDoc(code), {
    useCount: invite.useCount + 1,
  })

  await batch.commit()

  return { groupId, groupName: group.name }
}

// ── FETCH USER'S GROUPS ───────────────────────────────────────────
export async function fetchUserGroups(
  groupIds: string[]
): Promise<GroupInput[]> {
  if (groupIds.length === 0) return []

  // Firestore 'in' query supports max 30 items
  // For > 30 groups (unlikely but possible), chunk the query
  const chunks: string[][] = []
  for (let i = 0; i < groupIds.length; i += 30) {
    chunks.push(groupIds.slice(i, i + 30))
  }

  const results: GroupInput[] = []

  for (const chunk of chunks) {
    const q = query(groupsCol(), where('__name__', 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach((d) => results.push(d.data()))
  }

  // Sort by most recently created
  return results.sort((a, b) => {
    const aTime = (a.createdAt as unknown as Timestamp)?.toMillis() ?? 0
    const bTime = (b.createdAt as unknown as Timestamp)?.toMillis() ?? 0
    return bTime - aTime
  })
}

// ── FETCH SINGLE GROUP ────────────────────────────────────────────
export async function fetchGroup(groupId: string): Promise<GroupInput | null> {
  const snap = await getDoc(groupDoc(groupId))
  if (!snap.exists()) return null
  return snap.data()
}

// ── LEAVE GROUP ───────────────────────────────────────────────────
export async function leaveGroup(
  groupId: string,
  uid:     string
): Promise<void> {
  const groupSnap = await getDoc(groupDoc(groupId))
  if (!groupSnap.exists()) throw new Error('Group not found.')

  const group = groupSnap.data()

  // Creator cannot leave — must transfer ownership or dissolve group
  if (group.createdBy === uid) {
    throw new Error(
      'You created this group. Transfer admin to someone else before leaving.'
    )
  }

  const batch = writeBatch(db)

  // Remove from group.memberIds and group.adminIds
  batch.update(groupDoc(groupId), {
    memberIds: arrayRemove(uid),
    adminIds:  arrayRemove(uid),
  })

  // Remove from user.groups
  batch.update(userDoc(uid), {
    groups: arrayRemove(groupId),
  })

  await batch.commit()
}

// ── UPDATE GROUP ──────────────────────────────────────────────────
export async function updateGroup(update: GroupUpdate): Promise<void> {
  const validation = GroupUpdateSchema.safeParse(update)
  if (!validation.success) {
    throw new Error(`Invalid update: ${validation.error.issues[0].message}`)
  }
  const { id, ...rest } = update
  await (await import('firebase/firestore')).updateDoc(groupDoc(id), rest)
}

// ── REGENERATE INVITE CODE ────────────────────────────────────────
export async function regenerateInviteCode(
  groupId:   string,
  adminUid:  string,
  oldCode:   string
): Promise<string> {
  const newCode  = await getUniqueInviteCode()
  const batch    = writeBatch(db)

  // Delete old invite
  batch.delete(inviteDoc(oldCode))

  // Create new invite
  batch.set(inviteDoc(newCode), {
    groupId,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
    maxUses:   50,
    useCount:  0,
  })

  // Update group.inviteCode
  batch.update(groupDoc(groupId), { inviteCode: newCode })

  await batch.commit()
  return newCode
}
