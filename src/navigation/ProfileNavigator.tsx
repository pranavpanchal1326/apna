// src/navigation/ProfileNavigator.tsx
// Profile tab stack — profile home + notification settings.

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileScreen } from '@screens/profile/ProfileScreen'
import { NotificationSettingsScreen } from '@screens/profile/NotificationSettingsScreen'
import type { ProfileStackParamList } from './types'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  )
}
