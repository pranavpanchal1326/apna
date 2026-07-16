// Unit tests for the AI gateway's pure helpers.

import {
  hashCacheKey,
  istDateKey,
  parseGeminiResponse,
  parseGroqResponse,
  stripCodeFences,
  extractJsonPayload,
} from '../gateway'

describe('hashCacheKey', () => {
  it('is deterministic and Firestore-id safe', () => {
    const a = hashCacheKey('categorize:zomato dinner')
    expect(a).toBe(hashCacheKey('categorize:zomato dinner'))
    expect(a).toMatch(/^[a-f0-9]{40}$/)
    expect(a).not.toBe(hashCacheKey('categorize:other'))
  })
})

describe('istDateKey', () => {
  it('rolls the day over at IST midnight, not UTC', () => {
    // 2026-07-16 20:00 UTC = 2026-07-17 01:30 IST
    expect(istDateKey(Date.parse('2026-07-16T20:00:00Z'))).toBe('2026-07-17')
    expect(istDateKey(Date.parse('2026-07-16T10:00:00Z'))).toBe('2026-07-16')
  })
})

describe('parseGeminiResponse', () => {
  it('joins parts and trims', () => {
    const body = {
      candidates: [{ content: { parts: [{ text: 'food' }, { text: '\n' }] } }],
    }
    expect(parseGeminiResponse(body)).toBe('food')
  })

  it('returns null for empty or malformed bodies', () => {
    expect(parseGeminiResponse({})).toBeNull()
    expect(parseGeminiResponse({ candidates: [] })).toBeNull()
    expect(parseGeminiResponse({ candidates: [{ content: { parts: [{ text: '' }] } }] })).toBeNull()
    expect(parseGeminiResponse(null)).toBeNull()
  })
})

describe('parseGroqResponse', () => {
  it('extracts the first choice message', () => {
    expect(parseGroqResponse({ choices: [{ message: { content: ' transport ' } }] })).toBe(
      'transport',
    )
  })

  it('returns null for malformed bodies', () => {
    expect(parseGroqResponse({})).toBeNull()
    expect(parseGroqResponse({ choices: [{ message: {} }] })).toBeNull()
  })
})

describe('stripCodeFences', () => {
  it('unwraps ```json fences', () => {
    expect(stripCodeFences('```json\n[{"day":1}]\n```')).toBe('[{"day":1}]')
    expect(stripCodeFences('```\n{}\n```')).toBe('{}')
  })

  it('leaves plain text untouched', () => {
    expect(stripCodeFences('[{"day":1}]')).toBe('[{"day":1}]')
  })
})

describe('extractJsonPayload', () => {
  it('passes clean JSON through', () => {
    expect(extractJsonPayload('[{"day":1}]')).toBe('[{"day":1}]')
    expect(extractJsonPayload('{"a":1}')).toBe('{"a":1}')
  })

  it('strips prose preamble and suffix (small-model habit)', () => {
    expect(
      extractJsonPayload('Here is your itinerary:\n[{"day":1}]\nEnjoy your trip!'),
    ).toBe('[{"day":1}]')
  })

  it('handles fences embedded mid-prose', () => {
    expect(
      extractJsonPayload('Sure!\n```json\n[{"day":1}]\n```\nHave fun.'),
    ).toBe('[{"day":1}]')
  })

  it('picks arrays containing objects without truncating', () => {
    const payload = '[{"items":[{"a":"[weird] text"}]}]'
    expect(extractJsonPayload(`prefix ${payload}`)).toBe(payload)
  })

  it('returns trimmed text when there is no JSON at all', () => {
    expect(extractJsonPayload('  no json here  ')).toBe('no json here')
  })
})
