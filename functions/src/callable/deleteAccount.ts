// functions/src/callable/deleteAccount.ts
// GDPR-compliant account deletion (PRD §23).
// Server-side only — the client cannot perform these cross-document writes.
//
// What it does, in order:
//   1. For every group the user belongs to:
//      a. Sole member  → delete the whole group (subcollections, storage, RTDB)
//      b. Otherwise    → remove them from memberIds/adminIds/members map,
//         promote the earliest-joined remaining member if no admin is left,
//         delete memories they posted (docs + storage photos),
//         and clear their RTDB live-location node.
//   2. Deactivate referral links they own.
//   3. Delete their avatar files in Storage.
//   4. Replace users/{uid} with a "Deleted User" placeholder (removes phone,
//      phoneHash, upiId, fcmToken — all PII) so their name renders as
//      "Deleted User" wherever expenses/settlements still reference the uid.
//      Expenses and settlements are intentionally KEPT — they are the other
//      members' financial records.
//   5. Delete the Firebase Auth user (invalidates all sessions).

import * as admin from 'firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { storagePathFromUrl } from '../utils/storageUrl'

export { storagePathFromUrl }

/** Deletes a storage object by download URL. Missing objects are ignored. */
async function deleteStorageUrl(url: string): Promise<void> {
  const path = storagePathFromUrl(url)
  if (!path) return
  try {
    await admin.storage().bucket().file(path).delete({ ignoreNotFound: true })
  } catch (err) {
    console.warn(`[apna] deleteAccount: could not delete storage object ${path}:`, err)
  }
}

interface MemberEntry {
  role?: string
  joinedAt?: Timestamp
}

/**
 * Picks the earliest-joined remaining member to promote to admin
 * when the departing user was the group's only admin.
 */
export function pickNewAdmin(
  members: Record<string, MemberEntry>,
  departingUid: string,
): string | null {
  let best: string | null = null
  let bestJoined = Number.POSITIVE_INFINITY
  for (const [uid, entry] of Object.entries(members)) {
    if (uid === departingUid) continue
    const joined = entry?.joinedAt?.toMillis?.() ?? Number.POSITIVE_INFINITY
    if (best === null || joined < bestJoined) {
      best = uid
      bestJoined = joined
    }
  }
  return best
}

async function removeUserFromGroup(
  db: admin.firestore.Firestore,
  groupSnap: admin.firestore.QueryDocumentSnapshot,
  uid: string,
): Promise<void> {
  const groupId = groupSnap.id
  const data = groupSnap.data()
  const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : []
  const adminIds: string[] = Array.isArray(data.adminIds) ? data.adminIds : []
  const members: Record<string, MemberEntry> = data.members ?? {}

  const remaining = memberIds.filter((id) => id !== uid)

  if (remaining.length === 0) {
    // Sole member — delete the entire group and everything under it.
    await db.recursiveDelete(groupSnap.ref)
    try {
      await admin.storage().bucket().deleteFiles({ prefix: `groups/${groupId}/` })
    } catch (err) {
      console.warn(`[apna] deleteAccount: storage cleanup failed for group ${groupId}:`, err)
    }
    try {
      await admin.database().ref(`groups/${groupId}`).remove()
    } catch (err) {
      console.warn(`[apna] deleteAccount: RTDB cleanup failed for group ${groupId}:`, err)
    }
    return
  }

  // Delete memories this user posted (docs + their photos in Storage).
  const memoriesSnap = await groupSnap.ref
    .collection('memories')
    .where('addedBy', '==', uid)
    .get()
  for (const memSnap of memoriesSnap.docs) {
    const photos: Array<{ url?: string; thumbnail?: string }> = memSnap.data().photos ?? []
    for (const photo of photos) {
      if (photo.url) await deleteStorageUrl(photo.url)
      if (photo.thumbnail && photo.thumbnail !== photo.url) await deleteStorageUrl(photo.thumbnail)
    }
    await memSnap.ref.delete()
  }

  // Remove membership. Promote a replacement admin if they were the last one.
  const remainingAdmins = adminIds.filter((id) => id !== uid)
  const updates: Record<string, unknown> = {
    memberIds: remaining,
    [`members.${uid}`]: FieldValue.delete(),
  }
  if (remainingAdmins.length === 0) {
    const promoted = pickNewAdmin(members, uid)
    updates.adminIds = promoted ? [promoted] : remaining.slice(0, 1)
    const newAdminUid = (updates.adminIds as string[])[0]
    if (newAdminUid) updates[`members.${newAdminUid}.role`] = 'admin'
  } else {
    updates.adminIds = remainingAdmins
  }
  await groupSnap.ref.update(updates)

  // Clear live-location node in RTDB.
  try {
    await admin.database().ref(`groups/${groupId}/locations/${uid}`).remove()
  } catch (err) {
    console.warn(`[apna] deleteAccount: RTDB location cleanup failed for group ${groupId}:`, err)
  }
}

export const deleteAccount = onCall(
  { region: 'asia-south1', timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }
    const uid = request.auth.uid
    const db = admin.firestore()
    console.info(`[apna] deleteAccount: starting for uid=${uid}`)

    try {
      // 1. Leave (or delete) every group.
      const groupsSnap = await db
        .collection('groups')
        .where('memberIds', 'array-contains', uid)
        .get()
      for (const groupSnap of groupsSnap.docs) {
        await removeUserFromGroup(db, groupSnap, uid)
      }

      // 2. Deactivate referral links owned by this user.
      const linksSnap = await db
        .collection('referralLinks')
        .where('referrerUserId', '==', uid)
        .get()
      for (const linkSnap of linksSnap.docs) {
        await linkSnap.ref.update({ active: false })
      }

      // 3. Delete avatar files.
      try {
        await admin.storage().bucket().deleteFiles({ prefix: `users/${uid}/` })
      } catch (err) {
        console.warn(`[apna] deleteAccount: avatar cleanup failed for uid=${uid}:`, err)
      }

      // 4. Replace the user doc with a PII-free placeholder. Full overwrite
      //    (set without merge) drops phone, phoneHash, upiId, fcmToken, etc.
      await db.doc(`users/${uid}`).set({
        uid,
        name: 'Deleted User',
        avatarColor: '#7FA0B8',
        groups: [],
        deleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        phone: '',
      })

      // 5. Delete the Auth user — invalidates every session for this account.
      await admin.auth().deleteUser(uid)

      console.info(`[apna] deleteAccount: completed for uid=${uid} (groups=${groupsSnap.size})`)
      return { success: true }
    } catch (err) {
      console.error(`[apna] deleteAccount failed for uid=${uid}:`, err)
      throw new HttpsError('internal', 'Account deletion failed. Please try again.')
    }
  },
)
