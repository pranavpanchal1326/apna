// functions/src/callable/tripRecapCallables.ts
// Server-validated public recap generation and visibility control.

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { buildRecapSourceBundle } from '../recap/recapBuilder'
import { buildPublicRecapDoc, pruneUndefined, type RecapVisibility } from '../recap/sanitize'
import { buildShareSlug } from '../recap/slug'
import { storagePathFromUrl, signPhotoPaths, SIGNED_URL_TTL_MS } from '../utils/storageUrl'

const db = admin.firestore()
const RECAP_BASE_URL = 'https://apna.app/recap'

async function assertGroupMember(groupId: string, uid: string): Promise<void> {
  const groupSnap = await db.collection('groups').doc(groupId).get()
  if (!groupSnap.exists) {
    throw new HttpsError('not-found', 'Group not found')
  }
  const memberIds = (groupSnap.data()?.memberIds ?? []) as string[]
  if (!memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this group')
  }
}

async function findExistingSlug(groupId: string): Promise<string | undefined> {
  const snap = await db
    .collection('publicRecaps')
    .where('groupId', '==', groupId)
    .limit(1)
    .get()
  if (snap.empty) return undefined
  return snap.docs[0].data().shareSlug as string
}

export const generateTripRecap = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }

    const { groupId, options } = (request.data ?? {}) as {
      groupId?: string
      options?: {
        includeSpend?: boolean
        visibility?: RecapVisibility
        template?: string
      }
    }

    if (!groupId) {
      throw new HttpsError('invalid-argument', 'groupId is required')
    }

    await assertGroupMember(groupId, request.auth.uid)

    const bundle = await buildRecapSourceBundle(groupId)
    if (!bundle) {
      return { success: false, message: 'group_not_found' }
    }

    const existingSlug = await findExistingSlug(groupId)
    let existingVersion = 0
    if (existingSlug) {
      const existing = await db.collection('publicRecaps').doc(existingSlug).get()
      existingVersion = (existing.data()?.version as number) ?? 0
    }

    const shareSlug = buildShareSlug(bundle.groupName, existingSlug)
    const recapDoc = buildPublicRecapDoc({
      bundle,
      shareSlug,
      createdBy: request.auth.uid,
      includeSpend: options?.includeSpend,
      visibility: options?.visibility,
      existingVersion,
    })

    if (!recapDoc) {
      return { success: false, message: 'insufficient_data' }
    }

    if (existingSlug) {
      recapDoc.createdAt =
        (await db.collection('publicRecaps').doc(existingSlug).get()).data()
          ?.createdAt ?? recapDoc.createdAt
    }

    // PRD §23 — shared photos use 24h signed URLs, not permanent download
    // URLs. Paths are stored so refreshRecapPhotos can re-sign after expiry.
    const topPhotoPaths = bundle.topPhotoUrls
      .map((url) => storagePathFromUrl(url))
      .filter((path): path is string => Boolean(path))
    const signedUrls = await signPhotoPaths(topPhotoPaths, bundle.topPhotoUrls)
    const docWithSignedPhotos = pruneUndefined({
      ...recapDoc,
      topPhotos: signedUrls,
      coverPhotoUrl: signedUrls[0], // undefined when the group has no photos — pruned
      topPhotoPaths,
      photoUrlsExpireAt: Timestamp.fromMillis(Date.now() + SIGNED_URL_TTL_MS),
    })

    await db.collection('publicRecaps').doc(shareSlug).set(docWithSignedPhotos, { merge: false })

    return {
      success: true,
      recap: {
        ...docWithSignedPhotos,
        createdAt: recapDoc.createdAt.toMillis(),
        updatedAt: recapDoc.updatedAt.toMillis(),
        photoUrlsExpireAt: docWithSignedPhotos.photoUrlsExpireAt.toMillis(),
      },
      publicUrl: `${RECAP_BASE_URL}/${shareSlug}`,
    }
  },
)

// ── Photo URL refresh (PRD §23) ──────────────────────────────────────────────
// Signed URLs expire after 24h; viewers of an unlisted/public recap call this
// to re-sign. No auth required — visibility is the gate, same as the doc read.

export const refreshRecapPhotos = onCall(
  { region: 'asia-south1' },
  async (request) => {
    const { shareSlug } = (request.data ?? {}) as { shareSlug?: string }
    if (!shareSlug || typeof shareSlug !== 'string') {
      throw new HttpsError('invalid-argument', 'shareSlug is required')
    }

    const recapRef = db.collection('publicRecaps').doc(shareSlug)
    const recapSnap = await recapRef.get()
    if (!recapSnap.exists) {
      throw new HttpsError('not-found', 'Recap not found')
    }
    const recap = recapSnap.data()!
    if (recap.visibility === 'private') {
      throw new HttpsError('permission-denied', 'Recap is private')
    }

    const paths = (recap.topPhotoPaths ?? []) as string[]
    if (paths.length === 0) {
      // Legacy recap without stored paths — nothing to re-sign
      return { topPhotos: recap.topPhotos ?? [], coverPhotoUrl: recap.coverPhotoUrl }
    }

    // Still fresh for over an hour? Serve the stored URLs — keeps this
    // endpoint cheap under repeated public views.
    const expiresAt = recap.photoUrlsExpireAt as Timestamp | undefined
    if (expiresAt && expiresAt.toMillis() - Date.now() > 60 * 60 * 1000) {
      return { topPhotos: recap.topPhotos ?? [], coverPhotoUrl: recap.coverPhotoUrl }
    }

    const signedUrls = await signPhotoPaths(paths)
    if (signedUrls.length === 0) {
      return { topPhotos: recap.topPhotos ?? [], coverPhotoUrl: recap.coverPhotoUrl }
    }

    await recapRef.update({
      topPhotos: signedUrls,
      coverPhotoUrl: signedUrls[0],
      photoUrlsExpireAt: Timestamp.fromMillis(Date.now() + SIGNED_URL_TTL_MS),
    })

    return { topPhotos: signedUrls, coverPhotoUrl: signedUrls[0] }
  },
)

export const updateRecapVisibility = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }

    const { shareSlug, visibility } = (request.data ?? {}) as {
      shareSlug?: string
      visibility?: RecapVisibility
    }

    if (!shareSlug || !visibility) {
      throw new HttpsError('invalid-argument', 'shareSlug and visibility required')
    }

    const recapRef = db.collection('publicRecaps').doc(shareSlug)
    const recapSnap = await recapRef.get()
    if (!recapSnap.exists) {
      throw new HttpsError('not-found', 'Recap not found')
    }

    const recap = recapSnap.data()!
    await assertGroupMember(recap.groupId as string, request.auth.uid)

    if (recap.createdBy !== request.auth.uid) {
      const groupSnap = await db.collection('groups').doc(recap.groupId as string).get()
      const adminIds = (groupSnap.data()?.adminIds ?? []) as string[]
      if (!adminIds.includes(request.auth.uid)) {
        throw new HttpsError('permission-denied', 'Only recap creator or admin can change visibility')
      }
    }

    await recapRef.update({
      visibility,
      isPublic: visibility === 'public',
      updatedAt: Timestamp.now(),
    })

    return { success: true }
  },
)
