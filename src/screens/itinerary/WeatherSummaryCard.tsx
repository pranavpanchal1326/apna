import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import type { TripWeather, WeatherDay } from '../../lib/types/weather.types'

interface WeatherSummaryCardProps {
  weather: TripWeather | null
  activeDay: WeatherDay | undefined
  isLoading: boolean
  isRefreshing: boolean
  hasStaleCache: boolean
  onRefresh: () => void
}

export function WeatherSummaryCard({
  weather,
  activeDay,
  isLoading,
  isRefreshing,
  hasStaleCache,
  onRefresh,
}: WeatherSummaryCardProps) {
  const { colors, text, spacing, radius } = useTheme()
  const summary = getSummary(activeDay, Boolean(weather), isLoading)
  const updated = weather ? formatUpdatedAt(weather.fetchedAt, hasStaleCache) : 'Tap refresh'

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          borderRadius: radius.md,
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[text.label.md, { color: colors.textPrimary }]} numberOfLines={1}>
          {summary.title}
        </Text>
        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
          {summary.subtitle} · {updated}
        </Text>
      </View>

      <Pressable
        onPress={onRefresh}
        disabled={isRefreshing}
        style={[
          styles.refresh,
          {
            backgroundColor: `${colors.accentPrimary}14`,
            borderColor: colors.borderAccent,
            borderRadius: radius.full,
            opacity: isRefreshing ? 0.7 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Refresh weather"
      >
        <Text style={[text.label.sm, { color: colors.accentPrimary }]}>
          {isRefreshing ? '...' : '↻'}
        </Text>
      </Pressable>
    </View>
  )
}

function getSummary(
  day: WeatherDay | undefined,
  hasWeather: boolean,
  isLoading: boolean,
): { title: string; subtitle: string } {
  if (!day) {
    return {
      title: isLoading ? 'Checking forecast' : 'Forecast unavailable',
      subtitle: hasWeather ? 'No forecast for this day' : 'Weather will not block planning',
    }
  }

  if (day.condition === 'rain' || day.condition === 'thunderstorm') {
    return {
      title: 'Rain likely, keep a backup plan',
      subtitle: `${day.tempMax}° / ${day.tempMin}° · ${day.rainProbability}% rain`,
    }
  }

  const label = day.description ? capitalize(day.description) : 'Forecast ready'
  return {
    title: `${label}, ${day.tempMax}° / ${day.tempMin}°`,
    subtitle: day.rainProbability >= 40
      ? `${day.rainProbability}% rain chance`
      : `Feels like ${day.feelsLikeDay}°`,
  }
}

function formatUpdatedAt(fetchedAt: number, stale: boolean): string {
  const date = new Date(fetchedAt)
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return stale ? `stale · ${time}` : `updated ${time}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  card: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  refresh: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
