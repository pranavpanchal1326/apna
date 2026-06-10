import Constants from 'expo-constants'

export interface WeatherCoordinates {
  lat: number
  lon: number
  placeName: string
}

type MapboxGeocodeResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number]
    }
    properties?: {
      name?: string
      full_address?: string
      place_formatted?: string
    }
  }>
}

function getMapboxToken(): string {
  const extra = Constants.expoConfig?.extra as { mapboxToken?: string } | undefined
  return process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? extra?.mapboxToken ?? ''
}

export async function geocodeDestination(destination: string): Promise<WeatherCoordinates | null> {
  const token = getMapboxToken()
  const trimmed = destination.trim()
  if (!token || trimmed.length < 2) return null

  const query = new URLSearchParams({
    q: trimmed,
    access_token: token,
    country: 'in',
    language: 'en',
    limit: '1',
    types: 'place,locality,address,poi',
  })

  try {
    const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${query.toString()}`)
    if (!response.ok) return null

    const json = await response.json() as MapboxGeocodeResponse
    const feature = json.features?.[0]
    const coordinates = feature?.geometry?.coordinates
    if (!coordinates) return null

    const [lon, lat] = coordinates
    return {
      lat,
      lon,
      placeName: feature.properties?.name ??
        feature.properties?.full_address ??
        feature.properties?.place_formatted ??
        trimmed,
    }
  } catch {
    return null
  }
}
