// src/hooks/useBufferWarnings.ts
// PRD §13 — recomputes travel-time buffer warnings when the active day's
// items change. Debounced so drag-reorders don't spam the Directions API
// (the lib also caches per route).

import { useEffect, useState } from 'react'
import { computeBufferWarnings, type BufferWarning, type TimedStop } from '@lib/itinerary/travelTime'
import type { ItineraryItem } from '@lib/schemas'

/** Map: itemId (the stop being travelled TO) to warning. */
export function useBufferWarnings(items: ItineraryItem[]): Record<string, BufferWarning> {
  const [warnings, setWarnings] = useState<Record<string, BufferWarning>>({})

  // Signature only changes when order / times / places change — not on votes etc.
  const signature = items
    .map((i) => `${i.id}:${i.timeSlot?.startTime ?? ''}:${i.timeSlot?.endTime ?? ''}:${i.placeRef?.lat ?? ''}`)
    .join('|')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const stops: TimedStop[] = items.map((item) => ({
        id: item.id,
        coords:
          item.placeRef?.lat !== undefined && item.placeRef?.lng !== undefined
            ? { lat: item.placeRef.lat, lng: item.placeRef.lng }
            : undefined,
        startTime: item.timeSlot?.startTime,
        endTime: item.timeSlot?.endTime,
        durationMinutes: item.timeSlot?.durationMinutes ?? item.duration,
      }))

      const result = await computeBufferWarnings(stops)
      if (!cancelled) {
        setWarnings(Object.fromEntries(result.map((w) => [w.toItemId, w])))
      }
    }, 800)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return warnings
}
