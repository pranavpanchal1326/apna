// src/lib/places/placeSearch.ts
// Keyless place search backed by Photon (photon.komoot.io) — free OSM geocoder,
// no API key or signup required. Replaces Mapbox Geocoding v6.

import type { ItineraryCategory } from '../schemas'

export interface PlaceSearchResult {
  id: string
  name: string
  /** Human-readable secondary line, e.g. "MG Road, Bengaluru, Karnataka". */
  address: string
  lat: number
  lng: number
  /** OSM tag labels (e.g. "amenity", "restaurant") for category inference. */
  labels: string[]
}

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    osm_type?: string
    osm_id?: number
    osm_key?: string
    osm_value?: string
    name?: string
    housenumber?: string
    street?: string
    district?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

type PhotonResponse = {
  features?: PhotonFeature[]
}

interface SearchPlacesOptions {
  limit?: number
  signal?: AbortSignal
  /** Bias results toward a point (e.g. the user's location). */
  proximity?: { lat: number; lng: number }
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const limit = options.limit ?? 8
  const params = new URLSearchParams({
    q: trimmed,
    lang: 'en',
    // Over-fetch so the India filter below still fills the requested limit.
    limit: String(limit * 2),
  })
  if (options.proximity) {
    params.set('lat', String(options.proximity.lat))
    params.set('lon', String(options.proximity.lng))
  }

  const response = await fetch(`https://photon.komoot.io/api?${params.toString()}`, {
    signal: options.signal,
  })
  if (!response.ok) throw new Error(`Place search failed: ${response.status}`)

  const json = await response.json() as PhotonResponse
  return (json.features ?? [])
    .filter((f) => (f.properties?.countrycode ?? 'IN').toUpperCase() === 'IN')
    .map(normalizeFeature)
    .filter((r): r is PlaceSearchResult => r !== null)
    .slice(0, limit)
}

function normalizeFeature(feature: PhotonFeature): PlaceSearchResult | null {
  const coords = feature.geometry?.coordinates
  const props = feature.properties ?? {}
  if (!coords || !props.name) return null

  const [lng, lat] = coords
  const address = [
    [props.housenumber, props.street].filter(Boolean).join(' '),
    props.district,
    props.city,
    props.state,
  ].filter(Boolean).join(', ')

  return {
    id: `osm-${props.osm_type ?? 'N'}-${props.osm_id ?? `${lat},${lng}`}`,
    name: props.name,
    address,
    lat,
    lng,
    labels: [props.osm_key, props.osm_value]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.toLowerCase()),
  }
}

/** Maps OSM tag labels to an itinerary category (same heuristics as before). */
export function inferItineraryCategory(labels: string[]): ItineraryCategory {
  if (labels.some((l) => /restaurant|cafe|food|bar|pub/.test(l))) return 'food'
  if (labels.some((l) => /hotel|lodging|hostel|guest_house|stay/.test(l))) return 'stay'
  if (labels.some((l) => /airport|aerodrome|station|transit|bus|taxi|transport|railway/.test(l))) return 'transport'
  if (labels.some((l) => /shop|market|mall|store|supermarket/.test(l))) return 'shopping'
  if (labels.some((l) => /park|trail|activity|adventure|sport|leisure/.test(l))) return 'activity'
  return 'attraction'
}
