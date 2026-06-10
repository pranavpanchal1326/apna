export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fog'
  | 'haze'
  | 'unknown'

export interface WeatherDay {
  date: string
  tempMin: number
  tempMax: number
  feelsLikeDay: number
  condition: WeatherCondition
  description: string
  icon: string
  rainProbability: number
  humidity: number
  windSpeed: number
  isOutdoorRisk: boolean
}

export interface TripWeather {
  latitude: number
  longitude: number
  placeName: string
  fetchedAt: number
  days: WeatherDay[]
}

export interface WeatherCache {
  key: string
  payload: TripWeather
}
