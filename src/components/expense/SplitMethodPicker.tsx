// src/components/expense/SplitMethodPicker.tsx
// Equal / Exact / Percentage tab selector for split method.

import { memo, type ComponentType } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Scales, PencilSimple, Percent, type IconProps } from 'phosphor-react-native'
import { useTheme } from '@theme'
import type { SplitMethod } from '@lib/engine/splitEngine'

const METHODS: { key: SplitMethod; label: string; Icon: ComponentType<IconProps> }[] = [
  { key: 'equal',      label: 'Equal', Icon: Scales },
  { key: 'exact',      label: 'Exact', Icon: PencilSimple },
  { key: 'percentage', label: '%',     Icon: Percent },
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
                flexDirection:   'row',
                gap:             spacing.xs,
                alignItems:      'center',
                minHeight:       40,
                justifyContent:  'center',
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${method.label} split`}
          >
            <method.Icon size={16} color={isActive ? colors.textPrimary : colors.textSecondary} />
            <Text style={[
              text.label.lg,
              { color: isActive ? colors.textPrimary : colors.textSecondary },
            ]}>
              {method.label}
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
