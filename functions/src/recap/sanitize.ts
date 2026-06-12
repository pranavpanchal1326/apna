// functions/src/recap/sanitize.ts
// Server-side privacy filtering for public recaps.

import * as admin from 'firebase-admin'
import type { RecapSourceBundle } from './recapBuilder'

export type RecapVisibility = 'private' | 'unlisted' | 'public'

export interface PublicRecapDoc {
  id: string
  groupId: string
  tripName: string
  destination?: string
  startDate?: string
  endDate?: string
  dateRangeLabel: string
  createdAt: admin.firestore.Timestamp
  createdBy: string
  updatedAt: admin.firestore.Timestamp
  coverPhotoUrl?: string
  topPhotos: string[]
  coverEmoji?: string
  totalSpend?: number
  currency: string
  memberCount: number
  memoriesCount: number
  placesCount: number
  daysCount: number
  shareSlug: string
  isPublic: boolean
  visibility: RecapVisibility
  template: string
  tagline?: string
  includeSpend: boolean
  version: number
}

const TAGLINES = [
  'A trip worth remembering.',
  'Good times with the squad.',
  'Memories made together.',
]

export function assessEligibility(bundle: RecapSourceBundle): { ok: boolean; reason?: string } {
  if (!bundle.groupName?.trim()) return { ok: false, reason: 'insufficient_data' }
  const hasContent =
    bundle.memoriesCount > 0 ||
    bundle.placesVisitedCount > 0 ||
    Boolean(bundle.startDate) ||
    bundle.tripDays > 1
  if (!hasContent) return { ok: false, reason: 'no_content' }
  return { ok: true }
}

function defaultVisibility(status: string): RecapVisibility {
  return status === 'completed' ? 'unlisted' : 'private'
}

function pickTagline(bundle: RecapSourceBundle): string {
  if (bundle.destination?.trim()) {
    return `Explored ${bundle.destination.trim()} together.`
  }
  const idx =
    (bundle.groupName.length + bundle.memoriesCount) % TAGLINES.length
  return TAGLINES[idx]
}

export function buildPublicRecapDoc(params: {
  bundle: RecapSourceBundle
  shareSlug: string
  createdBy: string
  includeSpend?: boolean
  visibility?: RecapVisibility
  existingVersion?: number
}): PublicRecapDoc | null {
  const { bundle, shareSlug, createdBy, includeSpend, visibility, existingVersion } = params
  const eligibility = assessEligibility(bundle)
  if (!eligibility.ok) return null

  const resolvedVisibility = visibility ?? defaultVisibility(bundle.status)
  const spendAllowed = Boolean(includeSpend) && bundle.totalSpend > 0
  const now = admin.firestore.Timestamp.now()

  return {
    id: shareSlug,
    groupId: bundle.groupId,
    tripName: bundle.groupName,
    destination: bundle.destination?.trim() || undefined,
    startDate: bundle.startDate,
    endDate: bundle.endDate,
    dateRangeLabel: bundle.dateRangeLabel,
    createdAt: now,
    createdBy,
    updatedAt: now,
    coverPhotoUrl: bundle.topPhotoUrls[0],
    topPhotos: bundle.topPhotoUrls,
    coverEmoji: bundle.coverEmoji,
    totalSpend: spendAllowed ? bundle.totalSpend : undefined,
    currency: bundle.currency,
    memberCount: bundle.memberCount,
    memoriesCount: bundle.memoriesCount,
    placesCount: bundle.placesVisitedCount,
    daysCount: bundle.tripDays,
    shareSlug,
    isPublic: resolvedVisibility === 'public',
    visibility: resolvedVisibility,
    template: 'default',
    tagline: pickTagline(bundle),
    includeSpend: spendAllowed,
    version: (existingVersion ?? 0) + 1,
  }
}
