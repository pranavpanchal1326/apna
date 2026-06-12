// functions/src/referral/referralService.ts
// Server-side referral validation, attribution, and reward granting.

import * as admin from 'firebase-admin'
import {
  DEFAULT_CAMPAIGN_ID,
  REFERRAL_CODE_CHARS,
  REFERRAL_CODE_LENGTH,
  getCampaign,
  type ReferralRewardType,
} from './config'

const db = admin.firestore()

export interface ReferralLinkDoc {
  id: string
  referrerUserId: string
  code: string
  campaignId?: string
  groupId?: string
  createdAt: admin.firestore.Timestamp
  expiresAt?: admin.firestore.Timestamp
  active: boolean
}

export interface ReferralAttributionDoc {
  id: string
  referrerUserId: string
  referredUserId?: string
  inviteCode?: string
  campaignId?: string
  groupId?: string
  source: string
  status: 'captured' | 'qualified' | 'rewarded' | 'rejected'
  rejectionReason?: string
  rewardType?: ReferralRewardType
  capturedAt: admin.firestore.Timestamp
  qualifiedAt?: admin.firestore.Timestamp
  rewardedAt?: admin.firestore.Timestamp
}

function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)
    code += REFERRAL_CODE_CHARS[idx]
  }
  return code
}

function buildReferralUrl(code: string, campaignId: string, groupId?: string): string {
  const params = new URLSearchParams()
  if (campaignId !== DEFAULT_CAMPAIGN_ID) params.set('c', campaignId)
  if (groupId) params.set('g', groupId)
  const query = params.toString()
  return `https://apna.app/r/${code}${query ? `?${query}` : ''}`
}

function attributionDocId(referredUserId: string, campaignId: string): string {
  return `${referredUserId}_${campaignId}`
}

export async function ensureReferralLinkForUser(
  referrerUserId: string,
  campaignId: string,
  groupId?: string,
): Promise<{ code: string; url: string; campaignId: string; created: boolean }> {
  const campaign = getCampaign(campaignId)
  if (!campaign.active) {
    throw new Error('Campaign is not active')
  }

  const existingSnap = await db
    .collection('referralLinks')
    .where('referrerUserId', '==', referrerUserId)
    .where('campaignId', '==', campaignId)
    .where('active', '==', true)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    const link = existingSnap.docs[0].data() as ReferralLinkDoc
    return {
      code: link.code,
      url: buildReferralUrl(link.code, campaignId, groupId ?? link.groupId),
      campaignId,
      created: false,
    }
  }

  let code = generateReferralCode()
  let attempts = 0
  while (attempts < 8) {
    const codeSnap = await db.collection('referralLinks').doc(code).get()
    if (!codeSnap.exists) break
    code = generateReferralCode()
    attempts++
  }

  const now = admin.firestore.Timestamp.now()
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + campaign.linkTtlDays * 24 * 60 * 60 * 1000,
  )

  const linkDoc: ReferralLinkDoc = {
    id: code,
    referrerUserId,
    code,
    campaignId,
    groupId,
    createdAt: now,
    expiresAt,
    active: true,
  }

  await db.collection('referralLinks').doc(code).set(linkDoc)

  return {
    code,
    url: buildReferralUrl(code, campaignId, groupId),
    campaignId,
    created: true,
  }
}

export async function captureReferralForUser(params: {
  referredUserId: string
  code: string
  campaignId: string
  groupId?: string
  source: string
}): Promise<{
  success: boolean
  status: string
  message?: string
  attributionId?: string
}> {
  const { referredUserId, code, campaignId, groupId, source } = params
  const campaign = getCampaign(campaignId)

  if (!campaign.active) {
    return { success: false, status: 'rejected', message: 'campaign_inactive' }
  }

  const linkSnap = await db.collection('referralLinks').doc(code.toUpperCase()).get()
  if (!linkSnap.exists) {
    return { success: false, status: 'rejected', message: 'invalid_code' }
  }

  const link = linkSnap.data() as ReferralLinkDoc

  if (!link.active) {
    return { success: false, status: 'rejected', message: 'link_inactive' }
  }

  if (link.expiresAt && link.expiresAt.toMillis() < Date.now()) {
    return { success: false, status: 'rejected', message: 'link_expired' }
  }

  if (link.referrerUserId === referredUserId) {
    return { success: false, status: 'rejected', message: 'self_referral' }
  }

  const attrId = attributionDocId(referredUserId, campaignId)
  const existingAttr = await db.collection('referralAttributions').doc(attrId).get()

  if (existingAttr.exists) {
    const existing = existingAttr.data() as ReferralAttributionDoc
    if (existing.status !== 'rejected') {
      return { success: false, status: 'rejected', message: 'duplicate_attribution' }
    }
  }

  const attribution: ReferralAttributionDoc = {
    id: attrId,
    referrerUserId: link.referrerUserId,
    referredUserId,
    inviteCode: code.toUpperCase(),
    campaignId,
    groupId: groupId ?? link.groupId,
    source,
    status: 'captured',
    capturedAt: admin.firestore.Timestamp.now(),
  }

  await db.collection('referralAttributions').doc(attrId).set(attribution)

  return { success: true, status: 'captured', attributionId: attrId }
}

export async function qualifyReferralForUser(
  referredUserId: string,
  event: string,
  groupId?: string,
): Promise<{
  qualified: boolean
  rewarded: boolean
  status: string
  message?: string
}> {
  const snap = await db
    .collection('referralAttributions')
    .where('referredUserId', '==', referredUserId)
    .where('status', '==', 'captured')
    .limit(1)
    .get()

  if (snap.empty) {
    return { qualified: false, rewarded: false, status: 'none', message: 'no_pending_attribution' }
  }

  const attrRef = snap.docs[0].ref
  const attr = snap.docs[0].data() as ReferralAttributionDoc
  const campaign = getCampaign(attr.campaignId ?? DEFAULT_CAMPAIGN_ID)

  if (campaign.qualificationEvent !== event) {
    return { qualified: false, rewarded: false, status: 'skipped', message: 'event_mismatch' }
  }

  if (event === 'first_group_join') {
    const userSnap = await db.collection('users').doc(referredUserId).get()
    if (!userSnap.exists) {
      return { qualified: false, rewarded: false, status: 'rejected', message: 'user_not_found' }
    }
    const groups = (userSnap.data()?.groups ?? []) as string[]
    if (groups.length === 0) {
      return { qualified: false, rewarded: false, status: 'pending', message: 'no_group_yet' }
    }
  }

  const now = admin.firestore.Timestamp.now()

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(attrRef)
    if (!fresh.exists) return
    const data = fresh.data() as ReferralAttributionDoc
    if (data.status !== 'captured') return

    tx.update(attrRef, {
      status: 'qualified',
      qualifiedAt: now,
      ...(groupId ? { groupId } : {}),
    })
  })

  const rewardResult = await grantReferralReward(attr.id, campaign.rewardType)

  return {
    qualified: true,
    rewarded: rewardResult.granted,
    status: rewardResult.granted ? 'rewarded' : 'qualified',
    message: rewardResult.message,
  }
}

async function grantReferralReward(
  attributionId: string,
  rewardType: ReferralRewardType,
): Promise<{ granted: boolean; message?: string }> {
  const attrRef = db.collection('referralAttributions').doc(attributionId)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(attrRef)
    if (!snap.exists) return { granted: false, message: 'not_found' }

    const attr = snap.data() as ReferralAttributionDoc
    if (attr.status === 'rewarded') {
      return { granted: false, message: 'already_rewarded' }
    }
    if (attr.status !== 'qualified' && attr.status !== 'captured') {
      return { granted: false, message: 'not_eligible' }
    }

    const now = admin.firestore.Timestamp.now()

    if (rewardType === 'none') {
      tx.update(attrRef, { status: 'qualified', qualifiedAt: attr.qualifiedAt ?? now })
      return { granted: false, message: 'no_reward_configured' }
    }

    tx.update(attrRef, {
      status: 'rewarded',
      rewardType,
      qualifiedAt: attr.qualifiedAt ?? now,
      rewardedAt: now,
    })

    return { granted: true }
  })
}
