// src/navigation/RootNavigator.tsx
// Top-level navigator — switches between Auth and Main based on auth status.
// Also handles:
//   - Navigation-based Sentry breadcrumbs
//   - PostHog screen tracking
//   - Auth status transitions (auto-redirect after login/logout)
//   - Deep link routing via parseDeepLink + handleDeepLink (cold-start + warm-start)
//   - Auth-gated routing: pending nav resumed after successful login
//   - Public recap deep links (no login required)

import { useRef, useCallback, useEffect } from 'react'
import * as Linking from 'expo-linking'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { trackScreen } from '@lib/analytics'
import { useAuth } from '@hooks/useAuth'
import { linking } from './linking'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { SplashScreen } from '@screens/auth'
import { PublicRecapLandingScreen } from '@screens/recap/PublicRecapLandingScreen'
import { useTheme } from '@theme'
import { captureError } from '@lib/sentry'
import {
  handleDeepLink,
  resumePendingNavigation,
  getPendingNavigation,
} from './deeplink/handler'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

function PublicRecapScreenWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'PublicRecap'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  return (
    <PublicRecapLandingScreen
      slug={route.params.slug}
      onClose={() => navigation.goBack()}
    />
  )
}

export function RootNavigator() {
  const { colors, isDark } = useTheme()
  const { status } = useAuth()
  const navigationRef = useNavigationContainerRef<RootStackParamList>()
  const routeNameRef = useRef<string | undefined>(undefined)
  // Track whether we've already processed the cold-start URL
  const coldStartHandled = useRef(false)
  // Track previous auth status to detect login completion
  const prevStatusRef = useRef(status)

  const onNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.getCurrentRoute()?.name

    // Process cold-start deep link once navigation is ready
    if (!coldStartHandled.current) {
      coldStartHandled.current = true
      Linking.getInitialURL()
        .then((url) => {
          if (url) {
            handleDeepLink(url, {
              navigationRef,
              authStatus: status,
              urlSource: 'cold_start',
            })
          }
        })
        .catch((err) => captureError(err, { source: 'RootNavigator.coldStart' }))
    }
  }, [navigationRef, status])

  const onStateChange = useCallback(() => {
    const previousRoute = routeNameRef.current
    const currentRoute = navigationRef.getCurrentRoute()?.name
    if (currentRoute && currentRoute !== previousRoute) {
      trackScreen(currentRoute)
      routeNameRef.current = currentRoute
    }
  }, [navigationRef])

  // Warm-start: subscribe to incoming URLs while app is open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, {
        navigationRef,
        authStatus: status,
        urlSource: 'warm_start',
      })
    })
    return () => subscription.remove()
  }, [navigationRef, status])

  // Auth-gated resume: when user transitions to authenticated, check pending nav
  useEffect(() => {
    if (
      prevStatusRef.current !== 'authenticated' &&
      status === 'authenticated' &&
      navigationRef.isReady()
    ) {
      const pending = getPendingNavigation()
      if (pending) {
        resumePendingNavigation(pending, navigationRef)
      }
    }
    prevStatusRef.current = status
  }, [status, navigationRef])

  if (status === 'initializing') {
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
        <Stack.Screen
          name="PublicRecap"
          component={PublicRecapScreenWrapper}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
