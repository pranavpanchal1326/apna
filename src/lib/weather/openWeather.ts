import Constants from 'expo-constants'
import type { TripWeather } from '../types/weather.types'
import { normalizeWeatherResponse } from './weather.utils'

interface FetchTripWeatherParams {
  lat: number
  lon: number
  placeName: string
}

function getOpenWeatherApiKey(): string {
  const extra = Constants.expoConfig?.extra as { openWeatherApiKey?: string } | undefined
  return process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ??
    extra?.openWeatherApiKey ??
    ''
}

export async function fetchTripWeather(params: FetchTripWeatherParams): Promise<TripWeather> {
  const apiKey = getOpenWeatherApiKey()
  if (!apiKey) {
    throw new Error('Weather API key is not configured.')
  }

  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    appid: apiKey,
    units: 'metric',
    exclude: 'minutely,hourly,alerts,current',
  })

  const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`Weather forecast unavailable (${response.status}).`)
  }

  const raw = await response.json() as unknown
  return normalizeWeatherResponse(raw, params.placeName, params.lat, params.lon)
}
