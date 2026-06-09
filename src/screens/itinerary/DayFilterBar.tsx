// src/screens/itinerary/DayFilterBar.tsx (map overlay version)
// NOTE: This is a DIFFERENT component from the DayTabBar in Prompt 2.2.
// DayTabBar = bottom-border tabs for list view.
// DayFilterBar = floating pill chips over the map.
//
// Layout:
//   Floats at top of map screen, below status bar + safe area
//   Horizontal scrollable row of pill chips
//   First chip: "All days" — shows all pins across the trip
//   Remaining chips: "Day 1", "Day 2", etc.
//   Active chip: solid accentPrimary background, white text
//   Inactive chip: bgTertiary/80% opacity backdrop blur, border
//
// Background: semi-transparent overlay blur using bgSecondary + 0.85 opacity
// Shadow: shadow.md below the bar

import { useRef } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme }          from '../../theme'

export type DayFilter = 'all' | string   // 'all' or "YYYY-MM-DD"

interface DayFilterBarProps {
  dates:        string[]       // Trip dates "YYYY-MM-DD"
  activeFilter: DayFilter
  onSelect:     (filter: DayFilter) => void
  itemCounts:   Record<string, number>
}

export function DayFilterBar({
  dates,
  activeFilter,
  onSelect,
  itemCounts,
}: DayFilterBarProps) {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const insets    = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)

  const totalItems = Object.values(itemCounts).reduce((s, n) => s + n, 0)

  const chips: Array<{ id: DayFilter; label: string; count: number }> = [
    { id: 'all', label: 'All days', count: totalItems },
    ...dates.map((d, i) => ({
      id:    d as DayFilter,
      label: `Day ${i + 1}`,
      count: itemCounts[d] ?? 0,
    })),
  ]

  return (
    <View
      style={[
        styles.bar,
        {
          top:             insets.top + spacing.sm,
          backgroundColor: `${colors.bgSecondary}D9`,  // D9 = 85% opacity hex
          ...shadows.card,
        },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.sm,
          gap:               spacing.sm,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map(chip => {
          const isActive = activeFilter === chip.id
          return (
            <Pressable
              key={chip.id}
              onPress={() => onSelect(chip.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isActive
                    ? colors.accentPrimary
                    : `${colors.bgTertiary}CC`,  // CC = 80% opacity
                  borderColor:  isActive ? colors.accentPrimary : colors.border,
                  borderRadius: radius.full,
                  borderWidth:  1,
                  paddingHorizontal: spacing.md,
                  paddingVertical:   spacing.xs,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={`${chip.label}, ${chip.count} stops`}
            >
              <Text
                style={[
                  text.label.md,
                  {
                    color:      isActive ? colors.bgPrimary : colors.textSecondary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {chip.label}
                {chip.count > 0 && (
                  <Text
                    style={[
                      text.label.sm,
                      { color: isActive ? `${colors.bgPrimary}BB` : colors.textMuted },
                    ]}
                  >
                    {' '}{chip.count}
                  </Text>
                )}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left:     0,
    right:    0,
    zIndex:   10,
  },
  chip: {
    flexDirection: 'row',
    alignItems:    'center',
  },
})
