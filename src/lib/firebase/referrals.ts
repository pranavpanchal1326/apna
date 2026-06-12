// src/lib/firebase/referrals.ts
// Referral client service — UX + read queries. Reward state is server-validated.

import { httpsCallable } from 'firebase/functions'
import { getDocs, query, where } from 'firebase/firestore'
import { functions } from './config'
import { referralAttributionsCol } from './collections'
import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'
import {
  getPendingReferral,
  clearPendingReferral,
  setPendingReferral,
} from '@lib/referral/referral.storage'
import { buildReferralUrl } from '@lib/referral/referral.links'
import type {
  ReferralStats,
  ReferralAttribution,
  ReferralSource,
  PendingReferralContext,
} from '@lib/schemas/referral.schema'
import { DEFAULT_REFERRAL_CAMPAIGN_ID } from '@lib/schemas/referral.schema'

export interface EnsureReferralLinkResult {
  code: string
  url: string
  campaignId: string
  created: boolean
}

export interface CaptureReferralResult {
  success: boolean
  status?: string
  message?: string
  attributionId?: string
}

export interface QualifyReferralResult {
  qualified: boolean
  rewarded: boolean
  status?: string
  message?: string
}

const ensureReferralLinkFn = httpsCallable<
  { campaignId?: string; groupId?: string },
  EnsureReferralLinkResult
>(functions, 'ensureReferralLink')

const captureReferralAttributionFn = httpsCallable<
  {
    code: string
    campaignId?: string
    groupId?: string
    source: ReferralSource
  },
  CaptureReferralResult
>(functions, 'captureReferralAttribution')

const processReferralQualificationFn = httpsCallable<
  { event: string; groupId?: string },
  QualifyReferralResult
>(functions, 'processReferralQualification')

export async function ensureReferralLink(
  options?: { campaignId?: string; groupId?: string },
): Promise<EnsureReferralLinkResult> {
  const result = await ensureReferralLinkFn({
    campaignId: options?.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID,
    groupId: options?.groupId,
  })

  if (result.data.created) {
    track('referral_link_created', {
      campaign_id: result.data.campaignId,
      flow_variant: options?.groupId ? 'group_context' : 'default',
    })
  }

  return result.data
}

export async function captureReferralAttribution(params: {
  code: string
  campaignId?: string
  groupId?: string
  source: ReferralSource
}): Promise<CaptureReferralResult> {
  const result = await captureReferralAttributionFn(params)
  const data = result.data

  if (data.success) {
    track('referral_attribution_captured', {
      campaign_id: params.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID,
      source: params.source,
      status: data.status ?? 'captured',
    })
  } else if (data.status === 'rejected') {
    track('referral_reward_rejected', {
      campaign_id: params.campaignId ?? DEFAULT_REFERRAL_CAMPAIGN_ID,
      source: params.source,
      reason: data.message ?? 'unknown',
    })
  }

  return data
}

export async function processReferralQualification(
  groupId?: string,
): Promise<QualifyReferralResult> {
  try {
    const result = await processReferralQualificationFn({
      event: 'first_group_join',
      groupId,
    })
    const data = result.data

    if (data.qualified) {
      track('referral_qualified', {
        campaign_id: DEFAULT_REFERRAL_CAMPAIGN_ID,
        group_id: groupId ?? '',
      })
    }
    if (data.rewarded) {
      track('referral_reward_granted', {
        campaign_id: DEFAULT_REFERRAL_CAMPAIGN_ID,
        group_id: groupId ?? '',
      })
    }
    if (data.status === 'rejected') {
      track('referral_reward_rejected', {
        campaign_id: DEFAULT_REFERRAL_CAMPAIGN_ID,
        reason: data.message ?? 'qualification_failed',
      })
    }

    return data
  } catch (err) {
    captureError(err, { source: 'referrals.processReferralQualification' })
    return { qualified: false, rewarded: false, message: 'retry_later' }
  }
}

/** Commit MMKV pending referral after identity is established */
export async function flushPendingReferralAttribution(
  referredUserId: string,
): Promise<CaptureReferralResult | null> {
  const pending = getPendingReferral()
  if (!pending) return null

  try {
    const result = await captureReferralAttribution({
      code: pending.code,
      campaignId: pending.campaignId,
      groupId: pending.groupId,
      source: pending.source,
    })

    if (result.success) {
      clearPendingReferral()
      track('referral_signup_completed', {
        campaign_id: pending.campaignId,
        referred_user_id: referredUserId,
      })
    } else if (result.status === 'rejected') {
      clearPendingReferral()
    }

    return result
  } catch (err) {
    captureError(err, { source: 'referrals.flushPendingReferralAttribution' })
    return null
  }
}

export function storePendingReferralFromDeepLink(
  context: Omit<PendingReferralContext, 'capturedAt'>,
): void {
  setPendingReferral({
    ...context,
    capturedAt: Date.now(),
  })
}

export async function fetchReferralStats(referrerUserId: string): Promise<ReferralStats> {
  const snap = await getDocs(
    query(
      referralAttributionsCol(),
      where('referrerUserId', '==', referrerUserId),
    ),
  )

  const stats: ReferralStats = {
    captured: 0,
    qualified: 0,
    rewarded: 0,
    pending: 0,
    rejected: 0,
  }

  snap.docs.forEach((docSnap) => {
    const attr = docSnap.data() as ReferralAttribution
    switch (attr.status) {
      case 'captured':
        stats.captured++
        stats.pending++
        break
      case 'qualified':
        stats.qualified++
        stats.pending++
        break
      case 'rewarded':
        stats.rewarded++
        break
      case 'rejected':
        stats.rejected++
        break
    }
  })

  return stats
}

export async function fetchReferrerAttributions(
  referrerUserId: string,
): Promise<ReferralAttribution[]> {
  const snap = await getDocs(
    query(
      referralAttributionsCol(),
      where('referrerUserId', '==', referrerUserId),
    ),
  )
  return snap.docs.map((d) => d.data())
}

export function getShareableReferralUrl(
  code: string,
  options?: { campaignId?: string; groupId?: string },
): string {
  return buildReferralUrl(code, options)
}
