// App.tsx — updated for Prompt 0.4
// Temporary navigation: local state machine drives auth flow.
// React Navigation replaces this entirely in Prompt 0.5.

import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@theme'
import { useAuthStore } from '@stores/auth.store'
import {
  SplashScreen,
  PhoneInputScreen,
  OTPScreen,
  ProfileSetupScreen,
} from '@screens/auth'

type AppScreen =
  | 'splash'
  | 'phone'
  | 'otp'
  | 'profile_setup'
  | 'home'  // Placeholder until Prompt 0.5

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize)
  const status     = useAuthStore((s) => s.status)
  const [screen, setScreen] = useState<AppScreen>('splash')

  // Initialize auth listener once
  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  // React to auth status changes
  useEffect(() => {
    if (status === 'authenticated' && screen !== 'home') {
      setScreen('home')
    }
    if (status === 'needs_profile' && screen !== 'profile_setup') {
      setScreen('profile_setup')
    }
  }, [status, screen])

  if (screen === 'splash') {
    return (
      <SplashScreen
        onComplete={() => {
          if (status === 'authenticated') setScreen('home')
          else if (status === 'needs_profile') setScreen('profile_setup')
          else setScreen('phone')
        }}
      />
    )
  }

  if (screen === 'phone') {
    return <PhoneInputScreen onOTPSent={() => setScreen('otp')} />
  }

  if (screen === 'otp') {
    return (
      <OTPScreen
        onVerified={() => {
          // setFirebaseUser in store triggers status update,
          // which useEffect above catches and sets correct screen
        }}
        onBack={() => setScreen('phone')}
      />
    )
  }

  if (screen === 'profile_setup') {
    return <ProfileSetupScreen onComplete={() => setScreen('home')} />
  }

  // 'home' placeholder — replaced by React Navigation in Prompt 0.5
  return <SplashScreen onComplete={() => {}} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
