// src/lib/firebase/tripRecap.ts
// Public recap client service — server is source of truth for public artifacts.

import { httpsCallable } from 'firebase/functions'
import { getDoc } from 'firebase/firestore'
import { functions } from './config'
import { publicRecapDoc } from './collections'
import { track } from '@lib/analytics'
import type {
  PublicRecap,
  RecapGenerationOptions,
  RecapVisibility,
} from '@lib/schemas/publicRecap.schema'
import { buildPublicRecapUrl } from '@lib/recap/share'

export interface GenerateTripRecapResult {
  success: boolean
  recap?: PublicRecap
  publicUrl?: string
  message?: string
}

const generateTripRecapFn = httpsCallable<
  { groupId: string; options?: RecapGenerationOptions },
  GenerateTripRecapResult
>(functions, 'generateTripRecap')

const updateRecapVisibilityFn = httpsCallable<
  { shareSlug: string; visibility: RecapVisibility },
  { success: boolean }
>(functions, 'updateRecapVisibility')

const refreshRecapPhotosFn = httpsCallable<
  { shareSlug: string },
  { topPhotos: string[]; coverPhotoUrl?: string }
>(functions, 'refreshRecapPhotos')

export async function generateTripRecap(
  groupId: string,
  options?: RecapGenerationOptions,
): Promise<GenerateTripRecapResult> {
  const result = await generateTripRecapFn({ groupId, options })
  const data = result.data

  if (data.success && data.recap) {
    track('trip_recap_created', {
      visibility: data.recap.visibility,
      member_count: data.recap.memberCount,
      memories_count: data.recap.memoriesCount,
      include_spend: data.recap.includeSpend,
      template: data.recap.template,
    })
  }

  return data
}

export async function updateRecapVisibility(
  shareSlug: string,
  visibility: RecapVisibility,
): Promise<boolean> {
  const result = await updateRecapVisibilityFn({ shareSlug, visibility })
  return result.data.success
}

export async function fetchPublicRecapBySlug(
  shareSlug: string,
): Promise<PublicRecap | null> {
  const snap = await getDoc(publicRecapDoc(shareSlug))
  if (!snap.exists()) return null
  let recap = snap.data() as PublicRecap

  if (recap.visibility === 'private') return null

  // PRD §23 — photo URLs are signed with a 24h expiry. Refresh when stale
  // (or within the last hour) so shared links keep rendering photos.
  const expiresAtMillis = (
    recap.photoUrlsExpireAt as { toMillis?: () => number } | undefined
  )?.toMillis?.()
  if (
    recap.topPhotoPaths?.length &&
    expiresAtMillis !== undefined &&
    expiresAtMillis - Date.now() < 60 * 60 * 1000
  ) {
    try {
      const result = await refreshRecapPhotosFn({ shareSlug })
      recap = {
        ...recap,
        topPhotos: result.data.topPhotos,
        coverPhotoUrl: result.data.coverPhotoUrl ?? recap.coverPhotoUrl,
      }
    } catch {
      // Stale URLs may still render (grace on GCS side is none, but the doc
      // read must not fail because re-signing did)
    }
  }

  track('trip_recap_public_viewed', {
    share_slug: shareSlug,
    visibility: recap.visibility,
    member_count: recap.memberCount,
  })

  return recap
}

export function getRecapPublicUrl(recap: PublicRecap): string {
  return buildPublicRecapUrl(recap.shareSlug)
}
