// src/lib/itinerary/travelTime.ts
// PRD §13 — buffer-time warnings: "20 min gap, but routing says 35 min drive".
// Pure gap math + a cached OSRM Directions client (free, keyless). Degrades to
// silence: no coords, no times, or API failure → no warning, never an error.

export interface LatLng {
  lat: number
  lng: number
}

export interface TimedStop {
  id: string
  coords?: LatLng
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  durationMinutes?: number
}

export interface BufferWarning {
  /** Item id the traveller is heading TO. */
  toItemId: string
  gapMinutes: number
  driveMinutes: number
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

export function timeToMinutes(time?: string): number | null {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** When the traveller leaves a stop: endTime > start+duration > startTime. */
export function departureMinutes(stop: TimedStop): number | null {
  const end = timeToMinutes(stop.endTime)
  if (end !== null) return end
  const start = timeToMinutes(stop.startTime)
  if (start === null) return null
  return stop.durationMinutes ? start + stop.durationMinutes : start
}

/** Free minutes between leaving `from` and the start of `to`, or null. */
export function gapMinutes(from: TimedStop, to: TimedStop): number | null {
  const departure = departureMinutes(from)
  const arrival = timeToMinutes(to.startTime)
  if (departure === null || arrival === null) return null
  const gap = arrival - departure
  return gap >= 0 ? gap : null // overlapping/misordered times → no verdict
}

/**
 * Warn when the drive doesn't fit the gap (with a 5-minute grace so a
 * 30-min gap vs a 32-min drive doesn't nag).
 */
export function shouldWarn(gap: number, driveMinutes: number): boolean {
  return driveMinutes > gap + 5
}

// ── OSRM Directions (router.project-osrm.org — free demo server, no key) ────

// Session cache — routes between fixed stops don't change while planning.
// Coords rounded to ~100m so tiny GPS jitter doesn't bust the cache.
const driveCache = new Map<string, number | null>()

function cacheKey(from: LatLng, to: LatLng): string {
  const r = (n: number) => n.toFixed(3)
  return `${r(from.lat)},${r(from.lng)}→${r(to.lat)},${r(to.lng)}`
}

/** Driving minutes between two points via OSRM, or null. */
export async function fetchDrivingMinutes(from: LatLng, to: LatLng): Promise<number | null> {
  const key = cacheKey(from, to)
  if (driveCache.has(key)) return driveCache.get(key) ?? null

  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coords}` +
      `?overview=false&alternatives=false`
    const response = await fetch(url)
    if (!response.ok) {
      driveCache.set(key, null)
      return null
    }
    const body = (await response.json()) as {
      routes?: Array<{ duration?: number }>
    }
    const seconds = body.routes?.[0]?.duration
    const minutes = typeof seconds === 'number' ? Math.round(seconds / 60) : null
    driveCache.set(key, minutes)
    return minutes
  } catch {
    driveCache.set(key, null)
    return null
  }
}

/**
 * Computes buffer warnings for an ordered day of stops.
 * Only consecutive pairs with coords + usable times hit the API.
 */
export async function computeBufferWarnings(stops: TimedStop[]): Promise<BufferWarning[]> {
  const warnings: BufferWarning[] = []
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i]
    const to = stops[i + 1]
    if (!from.coords || !to.coords) continue

    const gap = gapMinutes(from, to)
    if (gap === null) continue

    const driveMinutes = await fetchDrivingMinutes(from.coords, to.coords)
    if (driveMinutes === null) continue

    if (shouldWarn(gap, driveMinutes)) {
      warnings.push({ toItemId: to.id, gapMinutes: gap, driveMinutes })
    }
  }
  return warnings
}
