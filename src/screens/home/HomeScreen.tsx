// src/screens/home/HomeScreen.tsx
import { Text } from 'react-native'
import { Screen } from '@components'
import { useTheme } from '@theme'
import { useAuth } from '@hooks/useAuth'

export function HomeScreen() {
  const { colors, text, spacing } = useTheme()
  const { user } = useAuth()
  return (
    <Screen>
      <Text style={[text.heading.lg, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Hey {user?.name?.split(' ')[0] ?? 'there'} 👋
      </Text>
      <Text style={[text.body.md, { color: colors.textSecondary }]}>
        Your groups will appear here.{'\n'}Phase 1 coming next.
      </Text>
    </Screen>
  )
}
