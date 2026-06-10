import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import type { WeatherDay } from '../../lib/types/weather.types'

interface WeatherDayChipProps {
  day: WeatherDay | undefined
}

export function WeatherDayChip({ day }: WeatherDayChipProps) {
  const { colors, text, radius, spacing } = useTheme()
  if (!day || day.condition === 'unknown') return null

  const warning = day.isOutdoorRisk
  const icon = getWeatherEmoji(day)
  const rainLabel = day.rainProbability >= 40 ? ` ${day.rainProbability}%` : ''

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: warning ? `${colors.warning}18` : colors.bgTertiary,
          borderColor: warning ? `${colors.warning}66` : colors.border,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs,
        },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        style={[
          text.label.sm,
          styles.label,
          { color: warning ? colors.warning : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {day.tempMax}/{day.tempMin}{rainLabel}
      </Text>
    </View>
  )
}

function getWeatherEmoji(day: WeatherDay): string {
  switch (day.condition) {
    case 'clear':
      return '☀'
    case 'clouds':
      return '☁'
    case 'rain':
    case 'drizzle':
      return '☂'
    case 'thunderstorm':
      return '⚡'
    case 'snow':
      return '❄'
    case 'mist':
    case 'fog':
    case 'haze':
      return '≋'
    default:
      return ''
  }
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 18,
    maxWidth: 76,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 3,
  },
  icon: {
    fontSize: 10,
    lineHeight: 13,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
  },
})
