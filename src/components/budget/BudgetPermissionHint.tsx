// src/components/budget/BudgetPermissionHint.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface BudgetPermissionHintProps {
  visible: boolean
}

export function BudgetPermissionHint({ visible }: BudgetPermissionHintProps) {
  const { colors, spacing, radius, text } = useTheme()

  if (!visible) return null

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgTertiary,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center' }]}>
        ℹ️ Only group admins can change the trip budget.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
