// src/screens/expense/components/ExpenseKeypad.tsx
// Custom numeric keypad — Blueprint §4.4.1. "System keyboards kill ritual;
// a custom pad lets us place a ₹, a decimal, and a backspace exactly."
// Emits the next amount string given the current one; the screen owns state.

import { useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Backspace } from 'phosphor-react-native'
import { useTheme } from '@theme'

interface ExpenseKeypadProps {
  value: string
  onChange: (next: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

export function ExpenseKeypad({ value, onChange }: ExpenseKeypadProps) {
  const { colors, text, spacing } = useTheme()

  const press = useCallback(
    (key: string) => {
      Haptics.selectionAsync()
      if (key === 'back') {
        onChange(value.slice(0, -1))
        return
      }
      if (key === '.') {
        if (value.includes('.')) return
        onChange(value === '' ? '0.' : value + '.')
        return
      }
      // block a third decimal digit and leading-zero pileups
      if (value.includes('.') && value.split('.')[1]?.length >= 2) return
      if (value === '0') { onChange(key); return }
      onChange(value + key)
    },
    [value, onChange]
  )

  return (
    <View style={styles.pad}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          onPress={() => press(key)}
          style={({ pressed }) => [
            styles.key,
            { opacity: pressed ? 0.5 : 1, marginBottom: spacing.sm },
          ]}
          accessibilityRole="button"
          accessibilityLabel={key === 'back' ? 'Backspace' : key}
        >
          {key === 'back' ? (
            <Backspace size={26} color={colors.textSecondary} weight="regular" />
          ) : (
            <Text style={[text.heading.lg, { color: colors.textPrimary }]}>{key}</Text>
          )}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.333%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
