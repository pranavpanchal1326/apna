// src/lib/utils/__tests__/mapNormalize.test.ts
import {
  normalizeItineraryPins,
  buildRouteSegments,
  deriveNextStop,
  calculateDistanceKm,
} from '../mapNormalize'
import type { ItineraryItem } from '../../schemas'

const item = (over: Partial<ItineraryItem> = {}): ItineraryItem =>
  ({
    id: 'i',
    isConfirmed: true,
    sortOrder: 0,
    placeRef: { lat: 15.3, lng: 73.9 },
    ...over,
  }) as unknown as ItineraryItem

describe('normalizeItineraryPins', () => {
  it('keeps only items that have coordinates', () => {
    const items = [
      item({ id: 'a' }),
      item({ id: 'b', placeRef: undefined }),
      item({ id: 'c', placeRef: { lat: 1 } as any }),
    ]
    expect(normalizeItineraryPins(items).map(i => i.id)).toEqual(['a'])
  })
})

describe('buildRouteSegments', () => {
  it('returns confirmed coordinates as [lng, lat] in sort order', () => {
    const items = [
      item({ id: 'b', sortOrder: 2, placeRef: { lat: 2, lng: 20 } as any }),
      item({ id: 'a', sortOrder: 1, placeRef: { lat: 1, lng: 10 } as any }),
    ]
    expect(buildRouteSegments(items)).toEqual([[10, 1], [20, 2]])
  })

  it('excludes unconfirmed items', () => {
    const items = [item({ isConfirmed: false })]
    expect(buildRouteSegments(items)).toEqual([])
  })
})

describe('deriveNextStop', () => {
  it('returns the first confirmed stop the user has not checked into or completed', () => {
    const items = [
      item({ id: 'a', sortOrder: 1, checkedInUids: ['me'] } as any),
      item({ id: 'b', sortOrder: 2 } as any),
      item({ id: 'c', sortOrder: 3 } as any),
    ]
    expect(deriveNextStop(items, 'me')?.id).toBe('b')
  })

  it('skips completed stops', () => {
    const items = [
      item({ id: 'a', sortOrder: 1, completedAt: {} } as any),
      item({ id: 'b', sortOrder: 2 } as any),
    ]
    expect(deriveNextStop(items, 'me')?.id).toBe('b')
  })

  it('returns null when everything is done', () => {
    const items = [item({ id: 'a', completedAt: {} } as any)]
    expect(deriveNextStop(items, 'me')).toBeNull()
  })
})

describe('calculateDistanceKm', () => {
  it('is zero for identical points', () => {
    expect(calculateDistanceKm(15.3, 73.9, 15.3, 73.9)).toBeCloseTo(0, 5)
  })

  it('is ~111 km for one degree of latitude', () => {
    expect(calculateDistanceKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0)
  })

  it('is symmetric', () => {
    const ab = calculateDistanceKm(15.3, 73.9, 19.0, 72.8)
    const ba = calculateDistanceKm(19.0, 72.8, 15.3, 73.9)
    expect(ab).toBeCloseTo(ba, 6)
  })
})
