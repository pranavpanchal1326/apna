// src/screens/trip/TripScreen.tsx
import { Text } from 'react-native'
import { Screen } from '@components'
import { useTheme } from '@theme'

export function TripScreen() {
  const { colors, text } = useTheme()
  return (
    <Screen>
      <Text style={[text.heading.lg, { color: colors.textPrimary }]}>Trip</Text>
      <Text style={[text.body.md, { color: colors.textSecondary, marginTop: 8 }]}>
        Itinerary + live map — Phase 3.
      </Text>
    </Screen>
  )
}
