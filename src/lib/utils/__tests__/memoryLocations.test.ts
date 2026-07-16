// src/lib/utils/__tests__/memoryLocations.test.ts

import { groupMemoriesByLocation, getLocationBounds } from '../memoryLocations'
import type { MemoryInput } from '@lib/schemas'

function mem(id: string, lat?: number, lng?: number, name?: string): MemoryInput {
  return {
    id,
    groupId: 'g1',
    type: 'photo',
    date: '2026-07-16',
    createdBy: 'u1',
    createdAt: null,
    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng, name } } : {}),
  } as MemoryInput
}

describe('groupMemoriesByLocation', () => {
  it('skips memories without coordinates', () => {
    expect(groupMemoriesByLocation([mem('a'), mem('b')])).toEqual([])
  })

  it('groups memories within ~11m into one pin', () => {
    const groups = groupMemoriesByLocation([
      mem('a', 26.98551, 75.85101),
      mem('b', 26.98549, 75.85099), // same spot, GPS jitter
      mem('c', 26.92, 75.82),       // different spot
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].memories.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('adopts the first available place name', () => {
    const groups = groupMemoriesByLocation([
      mem('a', 26.9855, 75.851),
      mem('b', 26.9855, 75.851, 'Amber Fort'),
    ])
    expect(groups[0].name).toBe('Amber Fort')
  })
})

describe('getLocationBounds', () => {
  it('returns null for empty input', () => {
    expect(getLocationBounds([])).toBeNull()
  })

  it('computes ne/sw corners as [lng, lat]', () => {
    const groups = groupMemoriesByLocation([
      mem('a', 26.9, 75.8),
      mem('b', 27.1, 76.0),
    ])
    expect(getLocationBounds(groups)).toEqual({
      ne: [76.0, 27.1],
      sw: [75.8, 26.9],
    })
  })
})
