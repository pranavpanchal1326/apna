// src/navigation/HomeNavigator.tsx
// Stack navigator inside the Home tab.
// HomeList → CreateGroup / JoinGroup → GroupHome

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '@theme'
import type { HomeStackParamList } from './types'

import { HomeScreen }        from '@screens/home/HomeScreen'
import { CreateGroupScreen } from '@screens/group/CreateGroupScreen'
import { JoinGroupScreen }   from '@screens/group/JoinGroupScreen'
import { GroupHomeScreen }   from '@screens/group/GroupHomeScreen'
import { AddExpenseScreen, ExpenseDetailScreen } from '@screens/expense'

const Stack = createNativeStackNavigator<HomeStackParamList>()

export function HomeNavigator() {
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
      <Stack.Screen name="HomeList"     component={HomeScreen} />
      <Stack.Screen name="CreateGroup"  component={CreateGroupScreen} />
      <Stack.Screen name="JoinGroup"    component={JoinGroupScreen} />
      <Stack.Screen
        name="GroupHome"
        component={GroupHomeScreen}
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen name="AddExpense"    component={AddExpenseScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
    </Stack.Navigator>
  )
}
