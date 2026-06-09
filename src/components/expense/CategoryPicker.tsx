// src/components/expense/CategoryPicker.tsx
// Horizontal scrollable category selector.
// 6 categories from PRD: food, stay, transport, activities, shopping, misc.
// Each has emoji icon + label. Selected state shows teal highlight.

import { memo } from 'react'
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import type { ExpenseCategory } from '@lib/schemas'

const CATEGORIES: { key: ExpenseCategory; emoji: string; label: string }[] = [
  { key: 'food',       emoji: '🍽️', label: 'Food'       },
  { key: 'stay',       emoji: '🏨', label: 'Stay'       },
  { key: 'transport',  emoji: '🚗', label: 'Transport'  },
  { key: 'activities', emoji: '🎯', label: 'Activities' },
  { key: 'shopping',   emoji: '🛍️', label: 'Shopping'   },
  { key: 'misc',       emoji: '📦', label: 'Misc'       },
]

interface Props {
  selected:   ExpenseCategory
  onSelect:   (category: ExpenseCategory) => void
}

export const CategoryPicker = memo(function CategoryPicker({ selected, onSelect }: Props) {
  const { colors, text, spacing, radius } = useTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = cat.key === selected
        return (
          <Pressable
            key={cat.key}
            onPress={() => {
              Haptics.selectionAsync()
              onSelect(cat.key)
            }}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? `${colors.accentPrimary}20`
                  : colors.bgTertiary,
                borderRadius:    radius.full,
                borderWidth:     isSelected ? 1.5 : 1,
                borderColor:     isSelected
                  ? colors.accentPrimary
                  : colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical:   spacing.sm,
                minHeight:         44,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${cat.label} category`}
          >
            <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
            <Text
              style={[
                text.label.md,
                {
                  color:      isSelected ? colors.accentPrimary : colors.textSecondary,
                  marginLeft: spacing.xs,
                },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center' },
})
