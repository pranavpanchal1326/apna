// src/lib/referral/referral.links.ts
// Referral URL parsing and share copy — separate from group invite codes.

import type { ReferralSource } from '@lib/schemas/referral.schema'
import { DEFAULT_REFERRAL_CAMPAIGN_ID } from '@lib/schemas/referral.schema'

const REFERRAL_BASE_URL = 'https://apna.app'
const REFERRAL_PATH_RE = /\/r\/([A-Za-z0-9]{4,32})/i

export interface ParsedReferralUrl {
  code: string
  campaignId: string
  groupId?: string
  source: ReferralSource
}

export function buildReferralUrl(
  code: string,
  options?: { campaignId?: string; groupId?: string },
): string {
  const params = new URLSearchParams()
  const campaignId = options?.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID
  if (campaignId !== DEFAULT_REFERRAL_CAMPAIGN_ID) {
    params.set('c', campaignId)
  }
  if (options?.groupId) {
    params.set('g', options.groupId)
  }
  const query = params.toString()
  return `${REFERRAL_BASE_URL}/r/${code}${query ? `?${query}` : ''}`
}

export function buildReferralDeepLink(
  code: string,
  options?: { campaignId?: string; groupId?: string },
): string {
  const params = new URLSearchParams()
  const campaignId = options?.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID
  if (campaignId !== DEFAULT_REFERRAL_CAMPAIGN_ID) {
    params.set('c', campaignId)
  }
  if (options?.groupId) {
    params.set('g', options.groupId)
  }
  const query = params.toString()
  return `apna://r/${code}${query ? `?${query}` : ''}`
}

export function parseReferralUrl(url: string): ParsedReferralUrl | null {
  if (!url) return null

  try {
    const normalized = url.trim()
    const pathMatch = normalized.match(REFERRAL_PATH_RE)
    if (!pathMatch?.[1]) return null

    const code = pathMatch[1].toUpperCase()
    const queryStart = normalized.indexOf('?')
    const queryString = queryStart >= 0 ? normalized.slice(queryStart + 1) : ''
    const params = new URLSearchParams(queryString)

    return {
      code,
      campaignId: params.get('c') ?? DEFAULT_REFERRAL_CAMPAIGN_ID,
      groupId: params.get('g') ?? undefined,
      source: 'deep_link',
    }
  } catch {
    return null
  }
}

export function buildReferralShareMessage(
  referrerName: string,
  url: string,
  context?: { groupName?: string },
): string {
  const firstName = referrerName.split(' ')[0] || 'A friend'
  if (context?.groupName) {
    return `${firstName} invited you to apna — we use it for "${context.groupName}". Join here: ${url}`
  }
  return `${firstName} thinks you'd like apna for trips and shared expenses. Join here: ${url}`
}
