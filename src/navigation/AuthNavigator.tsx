// src/navigation/AuthNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import type { AuthStackParamList } from './types'
import {
  ValueFramingScreen,
  PhoneInputScreen,
  OTPScreen,
  ProfileSetupScreen,
} from '@screens/auth'
import { useTheme } from '@theme'
import { useAuthStore } from '@stores/auth.store'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
        animationDuration: 240,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="ValueFraming" component={ValueFramingScreen} />
      <Stack.Screen name="PhoneInput" component={PhoneInputScreenWrapper} />
      <Stack.Screen name="OTP"         component={OTPScreenWrapper} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreenWrapper} />
    </Stack.Navigator>
  )
}

// ── Wrapper components — bridge Navigation props to screen props ──
// Screens use simple callback props (onOTPSent, onVerified, etc.)
// Wrappers translate navigation.navigate() into those callbacks.

function PhoneInputScreenWrapper() {
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<AuthStackParamList, 'PhoneInput'>>()
  const otpFlow = useAuthStore((s) => s.otpFlow)

  return (
    <PhoneInputScreen
      onOTPSent={() => navigation.navigate('OTP', { phone: otpFlow.phone })}
    />
  )
}

function OTPScreenWrapper() {
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<AuthStackParamList, 'OTP'>>()
  const status = useAuthStore((s) => s.status)

  return (
    <OTPScreen
      onVerified={() => {
        if (status === 'needs_profile') {
          navigation.navigate('ProfileSetup')
        }
        // If 'authenticated', RootNavigator handles redirect automatically
      }}
      onBack={() => navigation.goBack()}
    />
  )
}

function ProfileSetupScreenWrapper() {
  // ProfileSetup completion → RootNavigator detects 'authenticated' status
  // and switches to Main stack automatically — no explicit navigate needed
  return <ProfileSetupScreen onComplete={() => {}} />
}
