// src/lib/referral/__tests__/referral.links.test.ts
import {
  buildReferralUrl,
  buildReferralDeepLink,
  parseReferralUrl,
  buildReferralShareMessage,
} from '../referral.links'
import { DEFAULT_REFERRAL_CAMPAIGN_ID } from '@lib/schemas/referral.schema'

describe('buildReferralUrl', () => {
  it('builds a clean URL with no query for the default campaign', () => {
    expect(buildReferralUrl('ABCD')).toBe('https://apna.app/r/ABCD')
  })

  it('adds a campaign param only for non-default campaigns', () => {
    const url = buildReferralUrl('ABCD', { campaignId: 'summer' })
    expect(url).toContain('c=summer')
  })

  it('adds a group param when provided', () => {
    const url = buildReferralUrl('ABCD', { groupId: 'grp_1' })
    expect(url).toBe('https://apna.app/r/ABCD?g=grp_1')
  })
})

describe('buildReferralDeepLink', () => {
  it('uses the apna:// scheme', () => {
    expect(buildReferralDeepLink('ABCD')).toBe('apna://r/ABCD')
    expect(buildReferralDeepLink('ABCD', { groupId: 'grp_1' })).toBe('apna://r/ABCD?g=grp_1')
  })
})

describe('parseReferralUrl', () => {
  it('round-trips a built URL', () => {
    const url = buildReferralUrl('abcd', { groupId: 'grp_1' })
    const parsed = parseReferralUrl(url)
    expect(parsed).toMatchObject({ code: 'ABCD', groupId: 'grp_1', source: 'deep_link' })
  })

  it('uppercases the code and defaults the campaign', () => {
    const parsed = parseReferralUrl('https://apna.app/r/xy12')
    expect(parsed?.code).toBe('XY12')
    expect(parsed?.campaignId).toBe(DEFAULT_REFERRAL_CAMPAIGN_ID)
  })

  it('parses a deep-link scheme too', () => {
    expect(parseReferralUrl('apna://r/abcd')?.code).toBe('ABCD')
  })

  it('returns null for empty or non-referral URLs', () => {
    expect(parseReferralUrl('')).toBeNull()
    expect(parseReferralUrl('https://apna.app/about')).toBeNull()
  })

  it('reads campaign and group params', () => {
    const parsed = parseReferralUrl('https://apna.app/r/ABCD?c=diwali&g=grp_9')
    expect(parsed).toMatchObject({ code: 'ABCD', campaignId: 'diwali', groupId: 'grp_9' })
  })
})

describe('buildReferralShareMessage', () => {
  it('uses the referrer first name and includes the URL', () => {
    const msg = buildReferralShareMessage('Riya Sharma', 'https://apna.app/r/ABCD')
    expect(msg).toContain('Riya')
    expect(msg).not.toContain('Sharma')
    expect(msg).toContain('https://apna.app/r/ABCD')
  })

  it('mentions the group name when given', () => {
    const msg = buildReferralShareMessage('Riya', 'url', { groupName: 'Goa Trip' })
    expect(msg).toContain('Goa Trip')
  })

  it('falls back to "A friend" for an empty name', () => {
    expect(buildReferralShareMessage('', 'url')).toContain('A friend')
  })
})
