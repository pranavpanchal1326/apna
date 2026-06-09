// src/screens/itinerary/MapFAB.tsx
// Floating Action Button — bottom-right of map screen.
// Two variants:
//   'list'  — "☰ List" — returns to ItineraryScreen (list view)
//   'map'   — "🗺 Map"  — navigates to ItineraryMapScreen (from list view)
//
// Design: 48dp height pill button, bgTertiary fill, accentPrimary border
// Shadow: shadows.accentGlow — subtle teal glow
// Position: absolute bottom-right, respects safeAreaBottom

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme'

interface MapFABProps {
  variant:  'list' | 'map'
  onPress:  () => void
}

export function MapFAB({ variant, onPress }: MapFABProps) {
  const { colors, text, spacing, radius, shadows, layout } = useTheme()
  const insets = useSafeAreaInsets()

  const label = variant === 'list' ? '☰  List view' : '🗺  Map view'

  return (
    <View
      style={[
        styles.container,
        {
          bottom: layout.tabBarHeight + insets.bottom + spacing.lg,
          right:  spacing.lg,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed ? colors.bgSecondary : colors.bgTertiary,
            borderColor:     colors.accentPrimary,
            borderWidth:     1.5,
            borderRadius:    radius.full,
            paddingVertical:   spacing.sm + 2,
            paddingHorizontal: spacing.lg,
            ...shadows.accentGlow,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[text.label.md, { color: colors.accentPrimary, fontWeight: '600' }]}>
          {label}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex:   20,
  },
  fab: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
})
