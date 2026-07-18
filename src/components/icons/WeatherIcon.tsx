// src/components/icons/WeatherIcon.tsx
// Weather condition → Phosphor glyph (Blueprint §2.5, replaces the ☀/☁/☂
// text-glyph weather emoji). Colour is inherited from the call site.

import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, type IconProps } from 'phosphor-react-native'
import type { ComponentType } from 'react'
import type { WeatherCondition } from '@lib/types/weather.types'

const GLYPHS: Partial<Record<WeatherCondition, ComponentType<IconProps>>> = {
  clear:        Sun,
  clouds:       Cloud,
  rain:         CloudRain,
  drizzle:      CloudRain,
  thunderstorm: CloudLightning,
  snow:         Snowflake,
  mist:         CloudFog,
  fog:          CloudFog,
  haze:         CloudFog,
}

interface WeatherIconProps {
  condition: WeatherCondition
  size?: number
  color?: string
  weight?: IconProps['weight']
}

export function WeatherIcon({ condition, size = 14, color, weight = 'regular' }: WeatherIconProps) {
  const Glyph = GLYPHS[condition]
  if (!Glyph) return null
  return <Glyph size={size} color={color} weight={weight} />
}
