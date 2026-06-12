// functions/src/callable/referralCallables.ts
// Secure referral endpoints — clients cannot mint reward state directly.

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { DEFAULT_CAMPAIGN_ID } from '../referral/config'
import {
  ensureReferralLinkForUser,
  captureReferralForUser,
  qualifyReferralForUser,
} from '../referral/referralService'

export const ensureReferralLink = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }

    const { campaignId, groupId } = (request.data ?? {}) as {
      campaignId?: string
      groupId?: string
    }

    try {
      return await ensureReferralLinkForUser(
        request.auth.uid,
        campaignId ?? DEFAULT_CAMPAIGN_ID,
        groupId,
      )
    } catch (err) {
      console.error('[apna] ensureReferralLink failed:', err)
      throw new HttpsError('internal', 'Could not create referral link')
    }
  },
)

export const captureReferralAttribution = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }

    const { code, campaignId, groupId, source } = (request.data ?? {}) as {
      code?: string
      campaignId?: string
      groupId?: string
      source?: string
    }

    if (!code || typeof code !== 'string' || code.length < 4) {
      throw new HttpsError('invalid-argument', 'Valid referral code required')
    }

    const validSources = ['copy_link', 'share_sheet', 'qr', 'deep_link', 'manual']
    if (!source || !validSources.includes(source)) {
      throw new HttpsError('invalid-argument', 'Valid source required')
    }

    try {
      return await captureReferralForUser({
        referredUserId: request.auth.uid,
        code: code.toUpperCase(),
        campaignId: campaignId ?? DEFAULT_CAMPAIGN_ID,
        groupId,
        source,
      })
    } catch (err) {
      console.error('[apna] captureReferralAttribution failed:', err)
      throw new HttpsError('internal', 'Could not capture referral')
    }
  },
)

export const processReferralQualification = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }

    const { event, groupId } = (request.data ?? {}) as {
      event?: string
      groupId?: string
    }

    if (!event) {
      throw new HttpsError('invalid-argument', 'Qualification event required')
    }

    try {
      return await qualifyReferralForUser(request.auth.uid, event, groupId)
    } catch (err) {
      console.error('[apna] processReferralQualification failed:', err)
      throw new HttpsError('internal', 'Could not process referral qualification')
    }
  },
)
