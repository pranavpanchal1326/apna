// src/navigation/MemoriesStack.tsx
// Stack navigator for the Memories tab.

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MemoriesScreen }     from '@screens/memories/MemoriesScreen'
import { MemoryDetailScreen } from '@screens/memories/MemoryDetailScreen'
import { OnThisDayScreen }     from '@screens/memories/OnThisDayScreen'
import type { MemoriesStackParamList } from './types'
import { useTheme } from '@theme'

const Stack = createNativeStackNavigator<MemoriesStackParamList>()

export function MemoriesStack() {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation:    'slide_from_right',
      }}
    >
      <Stack.Screen name="MemoriesHome"  component={MemoriesScreen} />
      <Stack.Screen 
        name="MemoryDetail" 
        component={MemoryDetailScreen} 
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="OnThisDay"     component={OnThisDayScreen} />
    </Stack.Navigator>
  )
}
