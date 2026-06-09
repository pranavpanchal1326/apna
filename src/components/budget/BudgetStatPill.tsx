// src/components/budget/BudgetStatPill.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface BudgetStatPillProps {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'warning'
}

export function BudgetStatPill({ label, value, tone = 'neutral' }: BudgetStatPillProps) {
  const { colors, spacing, text, radius } = useTheme()

  let bg: string = colors.bgSecondary
  let border: string = colors.border
  let textValColor: string = colors.textPrimary

  if (tone === 'positive') {
    bg = `${colors.accentPrimary}0C`
    border = `${colors.accentPrimary}33`
    textValColor = colors.accentPrimary
  } else if (tone === 'warning') {
    bg = `${colors.accentGold}0C`
    border = `${colors.accentGold}33`
    textValColor = colors.accentGold
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <Text style={[text.body.sm, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[text.body.sm, { color: textValColor, marginTop: 2, fontWeight: 'bold' }]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    borderWidth: 1,
    minWidth: 96,
  },
})
