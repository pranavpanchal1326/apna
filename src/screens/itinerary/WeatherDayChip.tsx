import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { WeatherIcon } from '@components'
import type { WeatherDay } from '../../lib/types/weather.types'

interface WeatherDayChipProps {
  day: WeatherDay | undefined
}

export function WeatherDayChip({ day }: WeatherDayChipProps) {
  const { colors, text, radius, spacing } = useTheme()
  if (!day || day.condition === 'unknown') return null

  const warning = day.isOutdoorRisk
  const iconColor = warning ? colors.warning : colors.textSecondary
  const rainLabel = day.rainProbability >= 40 ? ` ${day.rainProbability}%` : ''

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: warning ? `${colors.warning}18` : colors.bgTertiary,
          borderColor: warning ? `${colors.warning}66` : colors.hairline,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs,
        },
      ]}
    >
      <WeatherIcon condition={day.condition} size={11} color={iconColor} />
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
