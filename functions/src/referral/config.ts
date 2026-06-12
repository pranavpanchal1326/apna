// functions/src/referral/config.ts
// Rule-driven referral config — change rewards/criteria without UI rewrites.

export const DEFAULT_CAMPAIGN_ID = 'default'

export type ReferralQualificationEvent = 'first_group_join' | 'account_created' | 'first_expense'
export type ReferralRewardType = 'badge' | 'premium_unlock' | 'feature_access' | 'account_credit' | 'none'

export interface ReferralCampaignConfig {
  id: string
  name: string
  active: boolean
  qualificationEvent: ReferralQualificationEvent
  rewardType: ReferralRewardType
  linkTtlDays: number
}

export const REFERRAL_CAMPAIGNS: Record<string, ReferralCampaignConfig> = {
  [DEFAULT_CAMPAIGN_ID]: {
    id: DEFAULT_CAMPAIGN_ID,
    name: 'Invite a friend',
    active: true,
    qualificationEvent: 'first_group_join',
    rewardType: 'badge',
    linkTtlDays: 365,
  },
}

export function getCampaign(campaignId?: string): ReferralCampaignConfig {
  const id = campaignId ?? DEFAULT_CAMPAIGN_ID
  return REFERRAL_CAMPAIGNS[id] ?? REFERRAL_CAMPAIGNS[DEFAULT_CAMPAIGN_ID]
}

export const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const REFERRAL_CODE_LENGTH = 8
export const MAX_REFERRAL_OPEN_ATTEMPTS = 20
