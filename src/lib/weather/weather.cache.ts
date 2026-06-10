import { createMMKV } from 'react-native-mmkv'
import type { TripWeather, WeatherCache } from '../types/weather.types'

const weatherStorage = createMMKV({ id: 'apna-trip-weather' })

export function buildWeatherCacheKey(groupId: string, destination: string): string {
  const normalized = destination.trim().toLowerCase().replace(/\s+/g, '-')
  return `trip-weather:${groupId}:${normalized || 'unknown'}`
}

export function getCachedWeather(key: string): TripWeather | null {
  const raw = weatherStorage.getString(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as WeatherCache
    if (parsed.key !== key || !isTripWeather(parsed.payload)) return null
    return parsed.payload
  } catch {
    return null
  }
}

export function setCachedWeather(key: string, payload: TripWeather): void {
  const cache: WeatherCache = { key, payload }
  weatherStorage.set(key, JSON.stringify(cache))
}

function isTripWeather(value: unknown): value is TripWeather {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { fetchedAt?: unknown; days?: unknown }
  return typeof candidate.fetchedAt === 'number' && Array.isArray(candidate.days)
}
