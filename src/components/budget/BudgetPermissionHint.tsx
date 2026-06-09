// src/components/budget/BudgetPermissionHint.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

export function BudgetPermissionHint() {
  const { colors, spacing, radius, text } = useTheme()

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
        ℹ️ Only group admins can edit the budget amount.
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
