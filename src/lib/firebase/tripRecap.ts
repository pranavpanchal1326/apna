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
  const recap = snap.data() as PublicRecap

  if (recap.visibility === 'private') return null

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
