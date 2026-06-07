// src/screens/budget/BudgetScreen.tsx
import { Text } from 'react-native'
import { Screen } from '@components'
import { useTheme } from '@theme'

export function BudgetScreen() {
  const { colors, text } = useTheme()
  return (
    <Screen>
      <Text style={[text.heading.lg, { color: colors.textPrimary }]}>Budget</Text>
      <Text style={[text.body.md, { color: colors.textSecondary, marginTop: 8 }]}>
        Expense splitting — Phase 2.
      </Text>
    </Screen>
  )
}
