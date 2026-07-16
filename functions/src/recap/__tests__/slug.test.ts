// functions/src/recap/__tests__/slug.test.ts

import { slugifyTripName, randomSlugSuffix, buildShareSlug } from '../slug'

describe('slugifyTripName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyTripName('Goa Trip 2026')).toBe('goa-trip-2026')
  })

  it('strips special characters and emoji', () => {
    expect(slugifyTripName('✈️ Manali!! (squad)')).toBe('manali-squad')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugifyTripName('--hello--')).toBe('hello')
  })

  it('caps at 24 characters', () => {
    expect(slugifyTripName('a'.repeat(50)).length).toBeLessThanOrEqual(24)
  })

  it("falls back to 'trip' for empty/non-latin names", () => {
    expect(slugifyTripName('')).toBe('trip')
    expect(slugifyTripName('!!!')).toBe('trip')
  })
})

describe('randomSlugSuffix', () => {
  it('produces the requested length from the safe alphabet', () => {
    const s = randomSlugSuffix(6)
    expect(s).toHaveLength(6)
    expect(s).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/)
  })
})

describe('buildShareSlug', () => {
  it('returns existing slug unchanged (stable share links)', () => {
    expect(buildShareSlug('New Name', 'goa-trip-abcd')).toBe('goa-trip-abcd')
  })

  it('builds name-suffix slug', () => {
    expect(buildShareSlug('Goa Trip')).toMatch(/^goa-trip-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/)
  })
})
