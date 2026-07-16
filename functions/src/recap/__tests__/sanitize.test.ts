// functions/src/recap/__tests__/sanitize.test.ts
// Privacy filtering — public recaps must never leak private internals.

import { assessEligibility, buildPublicRecapDoc } from '../sanitize'
import type { RecapSourceBundle } from '../recapBuilder'

function bundle(overrides: Partial<RecapSourceBundle> = {}): RecapSourceBundle {
  return {
    groupId: 'g1',
    groupName: 'Goa Trip',
    destination: 'Goa',
    dateRangeLabel: '2026-01-01 to 2026-01-05',
    currency: 'INR',
    status: 'completed',
    totalSpend: 25000,
    tripDays: 5,
    memberCount: 4,
    memoriesCount: 12,
    placesVisitedCount: 3,
    topPhotoUrls: ['https://x.com/a.jpg'],
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    ...overrides,
  }
}

describe('assessEligibility', () => {
  it('accepts a normal trip bundle', () => {
    expect(assessEligibility(bundle()).ok).toBe(true)
  })

  it('rejects unnamed groups', () => {
    expect(assessEligibility(bundle({ groupName: '  ' }))).toEqual({
      ok: false,
      reason: 'insufficient_data',
    })
  })

  it('rejects contentless groups', () => {
    const empty = bundle({
      memoriesCount: 0,
      placesVisitedCount: 0,
      startDate: undefined,
      tripDays: 1,
    })
    expect(assessEligibility(empty)).toEqual({ ok: false, reason: 'no_content' })
  })
})

describe('buildPublicRecapDoc', () => {
  const base = { shareSlug: 'goa-trip-ab12', createdBy: 'u1' }

  it('returns null for ineligible bundles', () => {
    expect(buildPublicRecapDoc({ ...base, bundle: bundle({ groupName: '' }) })).toBeNull()
  })

  it('NEVER includes spend unless explicitly opted in', () => {
    const doc = buildPublicRecapDoc({ ...base, bundle: bundle() })!
    expect(doc.totalSpend).toBeUndefined()
    expect(doc.includeSpend).toBe(false)
  })

  it('includes spend only with opt-in AND positive spend', () => {
    const optedIn = buildPublicRecapDoc({ ...base, bundle: bundle(), includeSpend: true })!
    expect(optedIn.totalSpend).toBe(25000)

    const zeroSpend = buildPublicRecapDoc({
      ...base,
      bundle: bundle({ totalSpend: 0 }),
      includeSpend: true,
    })!
    expect(zeroSpend.totalSpend).toBeUndefined()
    expect(zeroSpend.includeSpend).toBe(false)
  })

  it('defaults completed trips to unlisted, active trips to private', () => {
    expect(buildPublicRecapDoc({ ...base, bundle: bundle() })!.visibility).toBe('unlisted')
    expect(
      buildPublicRecapDoc({ ...base, bundle: bundle({ status: 'active' }) })!.visibility,
    ).toBe('private')
  })

  it('only marks isPublic for explicit public visibility', () => {
    expect(buildPublicRecapDoc({ ...base, bundle: bundle() })!.isPublic).toBe(false)
    expect(
      buildPublicRecapDoc({ ...base, bundle: bundle(), visibility: 'public' })!.isPublic,
    ).toBe(true)
  })

  it('increments version on regeneration', () => {
    expect(buildPublicRecapDoc({ ...base, bundle: bundle() })!.version).toBe(1)
    expect(buildPublicRecapDoc({ ...base, bundle: bundle(), existingVersion: 3 })!.version).toBe(4)
  })

  it('uses destination-based tagline when available', () => {
    expect(buildPublicRecapDoc({ ...base, bundle: bundle() })!.tagline).toBe(
      'Explored Goa together.',
    )
  })
})
