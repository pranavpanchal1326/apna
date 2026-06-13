// App.tsx — FINAL (replaces Prompt 0.4 version)
// Boot sequence:
//   1. Sentry init (first — catches everything after)
//   2. Font loading (required before any text renders)
//   3. Auth store initialization (Firebase Auth state listener)
//   4. React Navigation mounts (driven by auth status)
//   5. QueryClient + PostHog available to all screens

import 'react-native-gesture-handler'  // MUST be first import
import './src/tasks/backgroundLocation.task' // eslint-disable-next-line import/first
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar, Text } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'

import { ThemeProvider, useTheme } from '@theme'
import { RootNavigator } from '@navigation'
import { useAuthStore } from '@stores/auth.store'
import { useDhagaFonts } from '@lib/fonts'
import { initSentry, SentryErrorBoundary, captureError } from '@lib/sentry'
import { initAnalytics } from '@lib/analytics'
import { queryClient } from '@lib/query'

import { useNotifications } from '@hooks/useNotifications'
import { initializeUploadQueue } from '@lib/utils/receiptUploadQueue'
import { initReferralCapture } from '@lib/referral/referralCapture'
import { hapticEngine } from '@lib/haptics'
import { clearWidgetData } from '@lib/widget'

// ── Keep native splash visible until fonts loaded ────────────────
SplashScreen.preventAutoHideAsync()

// ── Boot: Sentry first, then analytics ───────────────────────────
initSentry()
initAnalytics()

// ── Inner app — has access to ThemeProvider context ──────────────
function AppShell() {
  const { colors, isDark } = useTheme()
  const [fontsLoaded, fontError] = useDhagaFonts()
  const initialize = useAuthStore((s) => s.initialize)
  const authStatus = useAuthStore((s) => s.status)

  // Register for FCM push notifications
  useNotifications()

  // Start Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initialize()
    initializeUploadQueue()
    const removeReferralCapture = initReferralCapture()
    return () => {
      unsubscribe()
      removeReferralCapture()
    }
  }, [initialize])

  // Clear widget bridge data on logout so stale data isn't shown
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      void clearWidgetData()
    }
  }, [authStatus])

  // Initialize haptics once fonts are ready and auth state has resolved
  useEffect(() => {
    if ((fontsLoaded || fontError) && authStatus !== 'initializing') {
      hapticEngine.init().catch((err) => {
        captureError(err, { source: 'haptic_init' })
      })
    }
  }, [fontsLoaded, fontError, authStatus])

  // Hide native splash once fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
    if (fontError) {
      captureError(fontError, { source: 'font_loading' })
    }
  }, [fontsLoaded, fontError])

  // Hold render until fonts ready — prevents FOUT (flash of unstyled text)
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.statusBar}
      />
      <RootNavigator />
    </>
  )
}

// ── Root component ────────────────────────────────────────────────
export default function App() {
  return (
    <SentryErrorBoundary
      fallback={() => (
        // Minimal error screen — styled with inline styles only (theme unavailable)
        // Full error boundary UI is a Phase 4 polish item
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080C14',
          alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#F0F4FF', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#8A94B0', fontSize: 14, textAlign: 'center' }}>
            The app encountered an unexpected error.{"\n"}Please restart.
          </Text>
        </GestureHandlerRootView>
      )}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <AppShell />
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SentryErrorBoundary>
  )
}
