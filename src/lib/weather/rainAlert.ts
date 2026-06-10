import type { ItineraryCategory } from '../schemas'
import type { WeatherCondition, WeatherDay } from '../types/weather.types'

const OUTDOOR_RISK_CATEGORIES: ItineraryCategory[] = ['activity', 'transport', 'attraction']
const SEVERE_CONDITIONS: WeatherCondition[] = ['rain', 'thunderstorm']

export interface RainAlert {
  level: 'soft' | 'strong'
  message: string
}

export function getRainAlertForItem(
  category: ItineraryCategory,
  weatherDay: WeatherDay | undefined,
): RainAlert | null {
  if (!weatherDay) return null

  const isSevere = SEVERE_CONDITIONS.includes(weatherDay.condition)
  if (isSevere && OUTDOOR_RISK_CATEGORIES.includes(category)) {
    return {
      level: 'strong',
      message: 'Outdoor plans may need a backup option.',
    }
  }

  if (weatherDay.rainProbability >= 60 && OUTDOOR_RISK_CATEGORIES.includes(category)) {
    return {
      level: 'soft',
      message: 'Rain likely around this stop.',
    }
  }

  return null
}
