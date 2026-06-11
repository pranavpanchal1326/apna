// src/navigation/HangoutsStack.tsx
// Stack navigator for the Hangouts tab.

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { HangoutsScreen }     from '@screens/hangouts/HangoutsScreen'
import { HangoutDetailScreen } from '@screens/hangouts/HangoutDetailScreen'
import type { HangoutsStackParamList } from './types'
import { useTheme } from '@theme'

const Stack = createNativeStackNavigator<HangoutsStackParamList>()

export function HangoutsStack() {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation:    'slide_from_right',
      }}
    >
      <Stack.Screen name="HangoutsHome"  component={HangoutsScreen}      />
      <Stack.Screen name="HangoutDetail" component={HangoutDetailScreen}  />
    </Stack.Navigator>
  )
}
