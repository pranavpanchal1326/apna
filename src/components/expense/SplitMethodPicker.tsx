// src/components/expense/SplitMethodPicker.tsx
// Equal / Exact / Percentage tab selector for split method.

import { memo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import type { SplitMethod } from '@lib/engine/splitEngine'

const METHODS: { key: SplitMethod; label: string; icon: string }[] = [
  { key: 'equal',      label: 'Equal',   icon: '⚖️' },
  { key: 'exact',      label: 'Exact',   icon: '✏️' },
  { key: 'percentage', label: '%',        icon: '📊' },
]

interface Props {
  selected: SplitMethod
  onSelect: (method: SplitMethod) => void
}

export const SplitMethodPicker = memo(function SplitMethodPicker({ selected, onSelect }: Props) {
  const { colors, text, spacing, radius } = useTheme()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgTertiary,
          borderRadius:    radius.lg,
          padding:         4,
          flexDirection:   'row',
        },
      ]}
    >
      {METHODS.map((method) => {
        const isActive = method.key === selected
        return (
          <Pressable
            key={method.key}
            onPress={() => {
              Haptics.selectionAsync()
              onSelect(method.key)
            }}
            style={[
              styles.tab,
              {
                flex:            1,
                paddingVertical: spacing.sm,
                borderRadius:    radius.md,
                backgroundColor: isActive ? colors.bgSecondary : 'transparent',
                alignItems:      'center',
                minHeight:       40,
                justifyContent:  'center',
                ...(isActive ? {
                  shadowColor:   '#000',
                  shadowOffset:  { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius:  3,
                  elevation:     2,
                } : {}),
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${method.label} split`}
          >
            <Text style={[
              text.label.lg,
              { color: isActive ? colors.textPrimary : colors.textSecondary },
            ]}>
              {method.icon} {method.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {},
  tab:       {},
})
