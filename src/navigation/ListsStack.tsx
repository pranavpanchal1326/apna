// src/navigation/ListsStack.tsx
// Stack navigator for the Lists tab — ListsHome and ListDetail.

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ListsScreen }      from '@screens/lists/ListsScreen'
import { ListDetailScreen } from '@screens/lists/ListDetailScreen'
import type { ListsStackParamList } from './types'
import { useTheme } from '@theme'

const Stack = createNativeStackNavigator<ListsStackParamList>()

export function ListsStack() {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:       false,
        contentStyle:      { backgroundColor: colors.bgPrimary },
        animation:         'slide_from_right',
      }}
    >
      <Stack.Screen name="ListsHome"  component={ListsScreen}      />
      <Stack.Screen name="ListDetail" component={ListDetailScreen}  />
    </Stack.Navigator>
  )
}
