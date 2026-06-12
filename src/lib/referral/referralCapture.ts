// src/lib/referral/referralCapture.ts
// Deep link listener — captures referral context before auth completes.

import * as Linking from 'expo-linking'
import { parseReferralUrl } from './referral.links'
import {
  setPendingReferral,
  getPendingReferral,
  incrementReferralOpenCount,
} from './referral.storage'
import { track } from '@lib/analytics'
import {
  DEFAULT_REFERRAL_CAMPAIGN_ID,
  MAX_REFERRAL_OPEN_ATTEMPTS,
} from '@lib/schemas/referral.schema'

export function initReferralCapture(): () => void {
  const handleUrl = (url: string | null) => {
    if (!url) return

    const parsed = parseReferralUrl(url)
    if (!parsed) return

    if (incrementReferralOpenCount(parsed.code) > MAX_REFERRAL_OPEN_ATTEMPTS) {
      track('referral_reward_rejected', {
        campaign_id: parsed.campaignId,
        source: 'deep_link',
        reason: 'rate_limited',
      })
      return
    }

    setPendingReferral({
      code: parsed.code,
      campaignId: parsed.campaignId,
      groupId: parsed.groupId,
      source: parsed.source,
      capturedAt: Date.now(),
    })

    track('referral_link_opened', {
      campaign_id: parsed.campaignId,
      source: 'deep_link',
      flow_variant: parsed.groupId ? 'group_context' : 'default',
    })
  }

  Linking.getInitialURL().then(handleUrl)
  const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url))

  return () => subscription.remove()
}

export function hasPendingReferral(): boolean {
  return Boolean(getPendingReferral())
}

export function getPendingReferralCampaignId(): string {
  return getPendingReferral()?.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID
}
