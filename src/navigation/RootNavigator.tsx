// src/navigation/RootNavigator.tsx
// Top-level navigator — switches between Auth and Main based on auth status.
// Also handles:
//   - Navigation-based Sentry breadcrumbs
//   - PostHog screen tracking
//   - Auth status transitions (auto-redirect after login/logout)

import { useRef, useCallback } from 'react'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { trackScreen } from '@lib/analytics'
import { useAuth } from '@hooks/useAuth'
import { linking } from './linking'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { SplashScreen } from '@screens/auth'
import { useTheme } from '@theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { colors, isDark } = useTheme()
  const { status } = useAuth()
  const navigationRef = useNavigationContainerRef()
  const routeNameRef = useRef<string | undefined>(undefined)

  // ── Track screen changes in PostHog + Sentry ─────────────────
  const onNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.getCurrentRoute()?.name
  }, [navigationRef])

  const onStateChange = useCallback(() => {
    const previousRoute = routeNameRef.current
    const currentRoute = navigationRef.getCurrentRoute()?.name

    if (currentRoute && currentRoute !== previousRoute) {
      trackScreen(currentRoute)
      routeNameRef.current = currentRoute
    }
  }, [navigationRef])

  if (status === 'initializing') {
    // Hold splash while Firebase Auth resolves (typically < 300ms)
    return <SplashScreen onComplete={() => {}} />
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={onNavigationReady}
      onStateChange={onStateChange}
      theme={{
        dark: isDark,
        colors: {
          primary:    colors.accentPrimary,
          background: colors.bgPrimary,
          card:       colors.bgSecondary,
          text:       colors.textPrimary,
          border:     colors.border,
          notification: colors.accentDanger,
        },
        fonts: {
          regular: { fontFamily: 'Outfit-Regular', fontWeight: '400' },
          medium:  { fontFamily: 'Outfit-Medium',  fontWeight: '500' },
          bold:    { fontFamily: 'Outfit-Bold',    fontWeight: '700' },
          heavy:   { fontFamily: 'Outfit-Bold',    fontWeight: '700' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        {status === 'unauthenticated' || status === 'needs_profile' ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
