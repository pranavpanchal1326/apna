import type { TripWeather, WeatherDay } from '../types/weather.types'
import { describeWmoCode, mapWmoCodeToCondition } from './weather.utils'

interface FetchTripWeatherParams {
  lat: number
  lon: number
  placeName: string
}

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_min?: number[]
    temperature_2m_max?: number[]
    apparent_temperature_max?: number[]
    precipitation_probability_max?: Array<number | null>
    relative_humidity_2m_mean?: number[]
    wind_speed_10m_max?: number[]
  }
}

// Open-Meteo (open-meteo.com) — free forecast API, no key required.
export async function fetchTripWeather(params: FetchTripWeatherParams): Promise<TripWeather> {
  const query = new URLSearchParams({
    latitude: String(params.lat),
    longitude: String(params.lon),
    daily: [
      'weather_code',
      'temperature_2m_min',
      'temperature_2m_max',
      'apparent_temperature_max',
      'precipitation_probability_max',
      'relative_humidity_2m_mean',
      'wind_speed_10m_max',
    ].join(','),
    forecast_days: '8',
    timezone: 'auto',
    wind_speed_unit: 'ms',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`Weather forecast unavailable (${response.status}).`)
  }

  const raw = await response.json() as OpenMeteoDailyResponse
  const daily = raw.daily ?? {}
  const days = (daily.time ?? []).slice(0, 8).map((date, i): WeatherDay => {
    const code = daily.weather_code?.[i] ?? -1
    const condition = mapWmoCodeToCondition(code)
    const rainProbability = Math.round(Math.max(0, Math.min(100, daily.precipitation_probability_max?.[i] ?? 0)))
    const tempMax = Math.round(daily.temperature_2m_max?.[i] ?? 0)

    return {
      date,
      tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      tempMax,
      feelsLikeDay: Math.round(daily.apparent_temperature_max?.[i] ?? tempMax),
      condition,
      description: describeWmoCode(code),
      icon: '',
      rainProbability,
      humidity: Math.round(daily.relative_humidity_2m_mean?.[i] ?? 0),
      windSpeed: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
      isOutdoorRisk: condition === 'rain' ||
        condition === 'drizzle' ||
        condition === 'thunderstorm' ||
        rainProbability >= 60,
    }
  })

  return {
    latitude: params.lat,
    longitude: params.lon,
    placeName: params.placeName,
    fetchedAt: Date.now(),
    days,
  }
}
