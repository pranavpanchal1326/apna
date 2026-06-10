// src/screens/itinerary/DayTabBar.tsx
// Horizontal scrollable day selector — "Day 1 · Aug 15", "Day 2 · Aug 16", etc.
// Active day tab has teal underline indicator (animated slide).
// Tapping a tab calls setActiveDay() and scrolls to that tab (ScrollView.scrollTo).
//
// DESIGN:
//   Height: 64dp
//   Active tab: text = textPrimary, bottom border 2dp accentPrimary
//   Inactive tab: text = textSecondary, no border
//   Day with items: small teal dot above the tab label (4dp circle)
//   Day with no items: no dot

import { useRef, useCallback } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTheme } from '../../theme'
import { WeatherDayChip } from './WeatherDayChip'
import type { DayPlan } from '../../lib/schemas'
import type { WeatherDay } from '../../lib/types/weather.types'

interface DayTabBarProps {
  dates:       string[]       // All trip dates "YYYY-MM-DD"
  dayPlans:    DayPlan[]      // Existing DayPlan docs (may not cover all dates)
  activeDayId: string | null
  onSelect:    (dayId: string) => void
  itemCounts:  Record<string, number>  // itemsByDay[dayId].length per day
  weatherByDate?: Record<string, WeatherDay>
}

// Format "YYYY-MM-DD" to "Aug 15"
function formatTabDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function DayTabBar({
  dates,
  dayPlans: _dayPlans,
  activeDayId,
  onSelect,
  itemCounts,
  weatherByDate,
}: DayTabBarProps) {
  const { colors, text, spacing } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const tabWidth  = 86  // Fixed tab width for consistent scrollable tabs

  const handleSelect = useCallback((dayId: string, index: number) => {
    onSelect(dayId)
    // Scroll to keep active tab visible
    scrollRef.current?.scrollTo({
      x: Math.max(0, index * tabWidth - 120),
      animated: true,
    })
  }, [onSelect, tabWidth])

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSecondary,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      >
        {dates.map((date, i) => {
          const dayNumber  = i + 1
          const isActive   = activeDayId === date
          const count      = itemCounts[date] ?? 0

          return (
            <Pressable
              key={date}
              onPress={() => handleSelect(date, i)}
              style={[
                styles.tab,
                {
                  width:           tabWidth,
                  borderBottomWidth: isActive ? 2 : 0,
                  borderBottomColor: colors.accentPrimary,
                  paddingBottom:   spacing.sm,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Day ${dayNumber}, ${formatTabDate(date)}${count > 0 ? `, ${count} items` : ''}`}
            >
              {/* Item count dot */}
              <View style={styles.dotRow}>
                {count > 0 && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.accentPrimary },
                    ]}
                  />
                )}
              </View>

              {/* Day number */}
              <Text
                style={[
                  text.label.md,
                  {
                    color:      isActive ? colors.accentPrimary : colors.textMuted,
                    textAlign:  'center',
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                Day {dayNumber}
              </Text>

              {/* Date */}
              <Text
                style={[
                  text.label.sm,
                  {
                    color:     isActive ? colors.textPrimary : colors.textMuted,
                    textAlign: 'center',
                    marginTop: 1,
                  },
                ]}
              >
                {formatTabDate(date)}
              </Text>

              <WeatherDayChip day={weatherByDate?.[date]} />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 82,
    justifyContent: 'flex-end',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dotRow: {
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  dot: {
    width:        4,
    height:       4,
    borderRadius: 2,
  },
})
