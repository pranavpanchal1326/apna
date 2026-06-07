// src/screens/memories/MemoriesScreen.tsx
import { Text } from 'react-native'
import { Screen } from '@components'
import { useTheme } from '@theme'

export function MemoriesScreen() {
  const { colors, text } = useTheme()
  return (
    <Screen>
      <Text style={[text.heading.lg, { color: colors.textPrimary }]}>Memories</Text>
      <Text style={[text.body.md, { color: colors.textSecondary, marginTop: 8 }]}>
        Auto album + AI wrap — Phase 4.
      </Text>
    </Screen>
  )
}
