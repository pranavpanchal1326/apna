// Unit tests for rules-first expense categorization (Phase 7.2).

import { categorizeByRules, normalizeAiCategory, buildCategorizePrompt } from '../categorize'

describe('categorizeByRules', () => {
  it.each([
    ['Zomato dinner', 'food'],
    ['chai at the dhaba', 'food'],
    ['OYO room night 2', 'stay'],
    ['Airbnb Goa villa', 'stay'],
    ['Ola to airport', 'transport'],
    ['petrol for the bike', 'transport'],
    ['IRCTC tickets', 'transport'],
    ['fort entry tickets', 'activities'],
    ['scuba diving session', 'activities'],
    ['souvenir shopping', 'shopping'],
    ['saree for mom', 'shopping'],
  ])('categorizes %s → %s', (description, expected) => {
    expect(categorizeByRules(description)).toBe(expected)
  })

  it('is case-insensitive', () => {
    expect(categorizeByRules('ZOMATO ORDER')).toBe('food')
  })

  it('matches word boundaries, not substrings', () => {
    // "autograph" must not match the "auto" (rickshaw) keyword
    expect(categorizeByRules('autograph book')).not.toBe('transport')
  })

  it('returns null for ambiguous descriptions (goes to AI)', () => {
    expect(categorizeByRules('miscellaneous stuff for raju')).toBeNull()
    expect(categorizeByRules('xyz')).toBeNull()
  })
})

describe('normalizeAiCategory', () => {
  it('accepts valid categories with noise around them', () => {
    expect(normalizeAiCategory(' Food.\n')).toBe('food')
    expect(normalizeAiCategory('TRANSPORT')).toBe('transport')
  })

  it('defaults to misc for anything unexpected', () => {
    expect(normalizeAiCategory('groceries')).toBe('misc')
    expect(normalizeAiCategory('')).toBe('misc')
  })
})

describe('buildCategorizePrompt', () => {
  it('truncates long descriptions to bound token usage', () => {
    const prompt = buildCategorizePrompt('x'.repeat(500))
    expect(prompt.length).toBeLessThan(400)
  })
})
