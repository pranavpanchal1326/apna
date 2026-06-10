import type { TripWeather, WeatherCondition, WeatherDay } from '../types/weather.types'

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

type RawWeatherResponse = {
  daily?: RawWeatherDay[]
}

type RawWeatherDay = {
  dt?: number
  temp?: {
    min?: number
    max?: number
  }
  feels_like?: {
    day?: number
  }
  weather?: Array<{
    id?: number
    description?: string
    icon?: string
  }>
  pop?: number
  humidity?: number
  wind_speed?: number
}

export function mapWeatherCodeToCondition(code: number): WeatherCondition {
  if (code >= 200 && code < 300) return 'thunderstorm'
  if (code >= 300 && code < 400) return 'drizzle'
  if (code >= 500 && code < 600) return 'rain'
  if (code >= 600 && code < 700) return 'snow'
  if (code === 701) return 'mist'
  if (code === 741) return 'fog'
  if (code === 721) return 'haze'
  if (code >= 700 && code < 800) return 'mist'
  if (code === 800) return 'clear'
  if (code > 800 && code < 900) return 'clouds'
  return 'unknown'
}

export function normalizeWeatherResponse(
  raw: unknown,
  placeName: string,
  lat: number,
  lon: number,
): TripWeather {
  const response = isRawWeatherResponse(raw) ? raw : { daily: [] }
  const days = (response.daily ?? []).slice(0, 8).map(normalizeDay)

  return {
    latitude: lat,
    longitude: lon,
    placeName,
    fetchedAt: Date.now(),
    days,
  }
}

export function isWeatherStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > THREE_HOURS_MS
}

function normalizeDay(day: RawWeatherDay): WeatherDay {
  const primary = day.weather?.[0]
  const code = primary?.id ?? 0
  const condition = mapWeatherCodeToCondition(code)
  const rainProbability = Math.round(Math.max(0, Math.min(1, day.pop ?? 0)) * 100)

  return {
    date: unixDayToDate(day.dt),
    tempMin: Math.round(day.temp?.min ?? 0),
    tempMax: Math.round(day.temp?.max ?? 0),
    feelsLikeDay: Math.round(day.feels_like?.day ?? day.temp?.max ?? 0),
    condition,
    description: primary?.description ?? 'Forecast unavailable',
    icon: primary?.icon ?? '',
    rainProbability,
    humidity: Math.round(day.humidity ?? 0),
    windSpeed: Math.round(day.wind_speed ?? 0),
    isOutdoorRisk: condition === 'rain' ||
      condition === 'drizzle' ||
      condition === 'thunderstorm' ||
      rainProbability >= 60,
  }
}

function unixDayToDate(timestampSeconds: number | undefined): string {
  if (!timestampSeconds) return new Date().toISOString().split('T')[0]
  return new Date(timestampSeconds * 1000).toISOString().split('T')[0]
}

function isRawWeatherResponse(value: unknown): value is RawWeatherResponse {
  if (!value || typeof value !== 'object') return false
  return Array.isArray((value as { daily?: unknown }).daily)
}
