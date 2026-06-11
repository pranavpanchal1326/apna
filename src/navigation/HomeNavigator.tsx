// src/navigation/HomeNavigator.tsx
// Stack navigator inside the Home tab.
// HomeList → CreateGroup / JoinGroup → GroupHome

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '@theme'
import type { HomeStackParamList } from './types'

import { HomeScreen }        from '@screens/home/HomeScreen'
import { CreateGroupScreen, JoinGroupScreen, GroupHomeScreen, GroupSettingsScreen, GroupMembersManageScreen, SettleUpScreen } from '@screens/group'
import { AddExpenseScreen, ExpenseDetailScreen } from '@screens/expense'
import { BalanceSummaryScreen } from '../screens/settlement'
import { NotificationDebugScreen } from '../screens/debug/NotificationDebugScreen'
import { TripWrapScreen } from '@screens/tripWrap/TripWrapScreen'
import { PrivacySettingsScreen } from '../screens/profile/PrivacySettingsScreen'

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
      <Stack.Screen name="AddExpense"         component={AddExpenseScreen} />
      <Stack.Screen name="ExpenseDetail"      component={ExpenseDetailScreen} />
      <Stack.Screen name="BalanceSummary"     component={BalanceSummaryScreen} />
      <Stack.Screen name="GroupSettings"      component={GroupSettingsScreen} />
      <Stack.Screen name="GroupMembersManage" component={GroupMembersManageScreen} />
      <Stack.Screen name="SettleUp"           component={SettleUpScreen} />
      <Stack.Screen name="TripWrap"           component={TripWrapScreen} />
      <Stack.Screen name="PrivacySettings"    component={PrivacySettingsScreen} />
      {__DEV__ && (
        <Stack.Screen name="NotificationDebug" component={NotificationDebugScreen} />
      )}
    </Stack.Navigator>
  )
}
