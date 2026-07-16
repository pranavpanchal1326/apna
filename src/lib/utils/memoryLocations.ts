// src/lib/utils/memoryLocations.ts
// Pure location-grouping for the Memories map view.
// Memories at (near-)identical coordinates share one pin.

import type { MemoryInput } from '@lib/schemas'

export interface MemoryLocationGroup {
  key: string
  lat: number
  lng: number
  name?: string
  memories: MemoryInput[]
}

// Round to 4 decimals (~11m) so photos taken at the same spot share one pin
function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

export function groupMemoriesByLocation(memories: MemoryInput[]): MemoryLocationGroup[] {
  const groups = new Map<string, MemoryLocationGroup>()
  for (const m of memories) {
    const lat = m.location?.lat
    const lng = m.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    const key = locationKey(lat, lng)
    const existing = groups.get(key)
    if (existing) {
      existing.memories.push(m)
      if (!existing.name && m.location?.name) existing.name = m.location.name
    } else {
      groups.set(key, { key, lat, lng, name: m.location?.name, memories: [m] })
    }
  }
  return [...groups.values()]
}

export function getLocationBounds(
  groups: MemoryLocationGroup[],
): { ne: [number, number]; sw: [number, number] } | null {
  if (groups.length === 0) return null
  const lats = groups.map((g) => g.lat)
  const lngs = groups.map((g) => g.lng)
  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
  }
}
