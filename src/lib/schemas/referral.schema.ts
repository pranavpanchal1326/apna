// src/lib/schemas/referral.schema.ts
// Referral data model — separate from group invite codes.
// Campaign-aware, rule-driven reward eligibility, server-validated state.

import { z } from 'zod'

export const REFERRAL_SOURCES = [
  'copy_link',
  'share_sheet',
  'qr',
  'deep_link',
  'manual',
] as const

export const REFERRAL_STATUSES = [
  'captured',
  'qualified',
  'rewarded',
  'rejected',
] as const

export const REFERRAL_REWARD_TYPES = [
  'badge',
  'premium_unlock',
  'feature_access',
  'account_credit',
  'none',
] as const

export const REFERRAL_QUALIFICATION_EVENTS = [
  'first_group_join',
  'account_created',
  'first_expense',
] as const

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]
export type ReferralRewardType = (typeof REFERRAL_REWARD_TYPES)[number]
export type ReferralQualificationEvent = (typeof REFERRAL_QUALIFICATION_EVENTS)[number]

/** Default campaign — extensible for seasonal / premium experiments */
export const DEFAULT_REFERRAL_CAMPAIGN_ID = 'default'

export interface ReferralCampaignConfig {
  id: string
  name: string
  active: boolean
  qualificationEvent: ReferralQualificationEvent
  rewardType: ReferralRewardType
  linkTtlDays?: number
}

/** Client-side guard against reinstall / spam open loops */
export const MAX_REFERRAL_OPEN_ATTEMPTS = 20

export const REFERRAL_CAMPAIGNS: Record<string, ReferralCampaignConfig> = {
  [DEFAULT_REFERRAL_CAMPAIGN_ID]: {
    id: DEFAULT_REFERRAL_CAMPAIGN_ID,
    name: 'Invite a friend',
    active: true,
    qualificationEvent: 'first_group_join',
    rewardType: 'badge',
    linkTtlDays: 365,
  },
}

export const ReferralLinkSchema = z.object({
  id: z.string().min(4).max(32),
  referrerUserId: z.string().min(1).max(128),
  code: z.string().min(4).max(32),
  campaignId: z.string().max(64).optional(),
  groupId: z.string().max(128).optional(),
  createdAt: z.unknown(),
  expiresAt: z.unknown().optional(),
  active: z.boolean(),
})

export const ReferralAttributionSchema = z.object({
  id: z.string().min(1).max(256),
  referrerUserId: z.string().min(1).max(128),
  referredUserId: z.string().max(128).optional(),
  inviteCode: z.string().max(32).optional(),
  campaignId: z.string().max(64).optional(),
  groupId: z.string().max(128).optional(),
  source: z.enum(REFERRAL_SOURCES),
  status: z.enum(REFERRAL_STATUSES),
  rejectionReason: z.string().max(120).optional(),
  rewardType: z.enum(REFERRAL_REWARD_TYPES).optional(),
  capturedAt: z.unknown(),
  qualifiedAt: z.unknown().optional(),
  rewardedAt: z.unknown().optional(),
})

export type ReferralLink = z.infer<typeof ReferralLinkSchema>
export type ReferralAttribution = z.infer<typeof ReferralAttributionSchema>

export interface ReferralStats {
  captured: number
  qualified: number
  rewarded: number
  pending: number
  rejected: number
}

export interface PendingReferralContext {
  code: string
  campaignId: string
  groupId?: string
  source: ReferralSource
  capturedAt: number
}
