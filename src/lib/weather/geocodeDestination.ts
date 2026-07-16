export interface WeatherCoordinates {
  lat: number
  lon: number
  placeName: string
}

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    latitude?: number
    longitude?: number
    name?: string
    admin1?: string
  }>
}

// Open-Meteo geocoding (geocoding-api.open-meteo.com) — free, no key required.
export async function geocodeDestination(destination: string): Promise<WeatherCoordinates | null> {
  const trimmed = destination.trim()
  if (trimmed.length < 2) return null

  const query = new URLSearchParams({
    name: trimmed,
    count: '1',
    language: 'en',
    format: 'json',
    countryCode: 'IN',
  })

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query.toString()}`)
    if (!response.ok) return null

    const json = await response.json() as OpenMeteoGeocodeResponse
    const result = json.results?.[0]
    if (typeof result?.latitude !== 'number' || typeof result?.longitude !== 'number') return null

    return {
      lat: result.latitude,
      lon: result.longitude,
      placeName: result.name ?? trimmed,
    }
  } catch {
    return null
  }
}
