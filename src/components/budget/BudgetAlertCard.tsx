// src/components/budget/BudgetAlertCard.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface BudgetAlertCardProps {
  tone: 'neutral' | 'warning' | 'danger'
  title: string
  message: string
}

export function BudgetAlertCard({ tone, title, message }: BudgetAlertCardProps) {
  const { colors, spacing, radius, text } = useTheme()

  let bg: string = colors.bgSecondary
  let border: string = colors.border
  let textColor: string = colors.textPrimary
  let emoji = 'ℹ️'

  if (tone === 'warning') {
    bg = `${colors.warning}0C` // ~5% opacity
    border = `${colors.warning}4D` // ~30% opacity
    textColor = colors.warning
    emoji = '⚠️'
  } else if (tone === 'danger') {
    bg = `${colors.accentDanger}0C`
    border = `${colors.accentDanger}4D`
    textColor = colors.accentDanger
    emoji = '🚨'
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.md }]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.content}>
          <Text style={[text.heading.sm, { color: textColor, fontSize: 16 }]}>
            {title}
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
})
