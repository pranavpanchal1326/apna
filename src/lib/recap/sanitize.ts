// src/lib/recap/sanitize.ts
// Centralized privacy filtering — public recap must never leak private internals.

import type { GroupInput } from '@lib/schemas'
import type {
  PublicRecap,
  RecapGenerationOptions,
  RecapVisibility,
} from '@lib/schemas/publicRecap.schema'
import type { TripWrapBundle } from '@lib/utils/tripWrapData'
import { selectTopTripMemories } from '@lib/utils/tripWrapData'

const SENSITIVE_CAPTION_PATTERNS = [
  /@\w+/,
  /\b\d{10}\b/,
  /\bpassword\b/i,
  /\bprivate\b/i,
  /\bsecret\b/i,
  /\boss?\b/i,
  /http:\/\//i,
]

const NEUTRAL_TAGLINES = [
  'A trip worth remembering.',
  'Good times with the squad.',
  'Memories made together.',
  'Another adventure in the books.',
]

export interface RecapEligibility {
  ok: boolean
  reason?: 'insufficient_data' | 'trip_incomplete' | 'no_content'
}

export function assessRecapEligibility(
  group: GroupInput,
  bundle: TripWrapBundle,
): RecapEligibility {
  if (!group.name?.trim()) {
    return { ok: false, reason: 'insufficient_data' }
  }

  const hasContent =
    bundle.memoriesCount > 0 ||
    bundle.placesVisitedCount > 0 ||
    Boolean(group.startDate) ||
    bundle.tripDays > 1

  if (!hasContent) {
    return { ok: false, reason: 'no_content' }
  }

  return { ok: true }
}

export function sanitizeCaption(caption?: string): string | undefined {
  if (!caption) return undefined
  const trimmed = caption.trim()
  if (trimmed.length < 3 || trimmed.length > 80) return undefined
  if (SENSITIVE_CAPTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return undefined
  }
  return trimmed
}

function pickTagline(group: GroupInput, bundle: TripWrapBundle): string {
  const destination = group.destination?.trim()
  if (destination) {
    return `Explored ${destination} together.`
  }
  const idx =
    (group.name.length + bundle.memoriesCount + bundle.placesVisitedCount) %
    NEUTRAL_TAGLINES.length
  return NEUTRAL_TAGLINES[idx]
}

function defaultVisibility(group: GroupInput): RecapVisibility {
  if (group.status !== 'completed') return 'private'
  return 'unlisted'
}

/**
 * Build a sanitized PublicRecap from private trip wrap data.
 * Strips settlements, balances, member names, and unapproved captions.
 */
export function buildSanitizedPublicRecap(params: {
  bundle: TripWrapBundle
  group: GroupInput
  createdBy: string
  shareSlug: string
  options?: RecapGenerationOptions
}): PublicRecap | null {
  const { bundle, group, createdBy, shareSlug, options } = params
  const eligibility = assessRecapEligibility(group, bundle)
  if (!eligibility.ok) return null

  const visibility = options?.visibility ?? defaultVisibility(group)
  const includeSpend = Boolean(options?.includeSpend) && bundle.totalSpend > 0
  const topMemories = selectTopTripMemories(
    bundle.topMemories.length > 0 ? bundle.topMemories : [],
  )

  const topPhotos = topMemories
    .map((m) => m.photoThumb || m.photoUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 6)

  const coverPhotoUrl = topPhotos[0]
  const now = Date.now()

  return {
    id: shareSlug,
    groupId: group.id,
    tripName: group.name,
    destination: group.destination?.trim() || undefined,
    startDate: group.startDate,
    endDate: group.endDate,
    dateRangeLabel: bundle.dateRange,
    createdAt: now,
    createdBy,
    updatedAt: now,
    coverPhotoUrl,
    topPhotos,
    coverEmoji: group.coverEmoji,
    totalSpend: includeSpend ? bundle.totalSpend : undefined,
    currency: bundle.currency || 'INR',
    memberCount: bundle.memberCount,
    memoriesCount: bundle.memoriesCount,
    placesCount: bundle.placesVisitedCount,
    daysCount: bundle.tripDays,
    shareSlug,
    isPublic: visibility === 'public',
    visibility,
    template: options?.template ?? 'default',
    tagline: pickTagline(group, bundle),
    includeSpend,
    version: 1,
  }
}
