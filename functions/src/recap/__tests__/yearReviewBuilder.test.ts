// Unit tests for the pure Year in Review aggregation helpers.

import { isInYear, topCategory, pickTopPhotos } from '../yearReviewBuilder'

describe('isInYear', () => {
  it('matches YYYY-MM-DD dates in the target year', () => {
    expect(isInYear({ date: '2026-07-16' }, 2026)).toBe(true)
    expect(isInYear({ date: '2026-01-01' }, 2026)).toBe(true)
  })

  it('rejects other years and malformed dates', () => {
    expect(isInYear({ date: '2025-12-31' }, 2026)).toBe(false)
    expect(isInYear({ date: 12345 }, 2026)).toBe(false)
    expect(isInYear({}, 2026)).toBe(false)
  })
})

describe('topCategory', () => {
  it('returns the most frequent category', () => {
    const expenses = [
      { category: 'food' },
      { category: 'food' },
      { category: 'transport' },
    ]
    expect(topCategory(expenses)).toBe('food')
  })

  it('returns null when no expenses have categories', () => {
    expect(topCategory([])).toBeNull()
    expect(topCategory([{ amount: 100 }])).toBeNull()
  })
})

describe('pickTopPhotos', () => {
  it('orders by engagement score and caps at the limit', () => {
    const memories = [
      { photos: [{ url: 'low.jpg' }] },
      { photos: [{ url: 'high.jpg' }], caption: 'best day', reactions: { a: '❤️', b: '🔥' } },
      { photos: [{ url: 'mid.jpg' }], caption: 'nice' },
    ]
    expect(pickTopPhotos(memories, 2)).toEqual(['high.jpg', 'mid.jpg'])
  })

  it('prefers thumbnails and supports legacy photoUrl docs', () => {
    const memories = [
      { photos: [{ url: 'full.jpg', thumb: 'thumb.jpg' }] },
      { photoUrl: 'legacy.jpg' },
    ]
    expect(pickTopPhotos(memories)).toEqual(['thumb.jpg', 'legacy.jpg'])
  })

  it('skips memories without photos', () => {
    expect(pickTopPhotos([{ caption: 'text only' }])).toEqual([])
  })
})
