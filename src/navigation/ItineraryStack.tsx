// src/navigation/ItineraryStack.tsx
// Stack navigator inside the Trip tab.
// ItineraryHome (ItineraryScreen)

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '../theme'
import { ItineraryScreen } from '../screens/itinerary/ItineraryScreen'
import type { ItineraryStackParamList } from './types'

const Stack = createNativeStackNavigator<ItineraryStackParamList>()

export function ItineraryStack() {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:      false,
        contentStyle:     { backgroundColor: colors.bgPrimary },
        animation:        'slide_from_right',
        animationDuration: 240,
        gestureEnabled:   true,
      }}
    >
      <Stack.Screen name="ItineraryHome" component={ItineraryScreen} />
    </Stack.Navigator>
  )
}
