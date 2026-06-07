// src/screens/auth/OTPScreen.tsx
// PRD §9.1: "OTP — 6-digit, auto-read via SMS permissions, 60s countdown to resend"
// Individual box inputs (1 per digit) with auto-focus advance.
// Auto-SMS read via expo-sms-retriever is Phase 4 polish — manual entry here.

import { useRef, useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Button, Screen } from '@components'
import { useAuthStore } from '@stores/auth.store'
import { verifyOTP } from '@lib/firebase/auth'
import { sendOTP } from '@lib/firebase/auth'
import type { RecaptchaRef } from '@lib/firebase/auth'
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'
import Constants from 'expo-constants'

const OTP_LENGTH = 6

interface OTPScreenProps {
  onVerified: () => void      // Navigate: to ProfileSetup (new) or Home (returning)
  onBack: () => void
}

export function OTPScreen({ onVerified, onBack }: OTPScreenProps) {
  const { colors, spacing, radius, text, fonts } = useTheme()
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null))
  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null)

  const otpFlow           = useAuthStore((s) => s.otpFlow)
  const setFirebaseUser   = useAuthStore((s) => s.setFirebaseUser)
  const setOTPVerificationId = useAuthStore((s) => s.setOTPVerificationId)
  const startResendCountdown = useAuthStore((s) => s.startResendCountdown)

  // Shake animation for wrong OTP
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  // ── Verify OTP ────────────────────────────────────────────────
  const handleVerify = useCallback(
    async (otp?: string) => {
      const code = otp ?? digits.join('')
      if (code.length !== OTP_LENGTH) return
      if (!otpFlow.verificationId) {
        setError('Session expired. Please request a new OTP.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const firebaseUser = await verifyOTP(otpFlow.verificationId, code)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await setFirebaseUser(firebaseUser)
        onVerified()
      } catch (err: unknown) {
        shake()
        setDigits(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()

        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('invalid-verification-code')) {
          setError('Wrong code. Check the SMS and try again.')
        } else if (msg.includes('session-expired')) {
          setError('Code expired. Request a new one.')
        } else {
          setError('Verification failed. Try again.')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [digits, otpFlow.verificationId, setFirebaseUser, onVerified, shake]
  )

  // ── Digit input handling ──────────────────────────────────────
  const handleDigitChange = useCallback(
    (value: string, index: number) => {
      const cleaned = value.replace(/\D/g, '').slice(-1)
      const newDigits = [...digits]
      newDigits[index] = cleaned
      setDigits(newDigits)
      setError(null)

      // Auto-advance to next input
      if (cleaned && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      // Auto-submit when all 6 digits entered
      if (cleaned && index === OTP_LENGTH - 1) {
        const fullOTP = [...newDigits.slice(0, OTP_LENGTH - 1), cleaned].join('')
        if (fullOTP.length === OTP_LENGTH) {
          handleVerify(fullOTP)
        }
      }
    },
    [digits, handleVerify]
  )

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        // Move to previous input on backspace when current is empty
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    },
    [digits]
  )

  // ── Resend OTP ────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (!otpFlow.canResend) return
    setDigits(Array(OTP_LENGTH).fill(''))
    setError(null)
    inputRefs.current[0]?.focus()

    try {
      const newId = await sendOTP(otpFlow.phone, recaptchaRef as RecaptchaRef)
      setOTPVerificationId(newId, otpFlow.phone)
      startResendCountdown()
    } catch {
      setError('Couldn\'t resend. Check your connection.')
    }
  }, [otpFlow, recaptchaRef, setOTPVerificationId, startResendCountdown])

  const maskedPhone = `+91 ${otpFlow.phone.slice(0, 5)} ${otpFlow.phone.slice(5)}`

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={Constants.expoConfig?.extra as Record<string, string>}
        attemptInvisibleVerification
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { paddingHorizontal: spacing['2xl'] }]}>

          {/* Back */}
          <Pressable
            onPress={onBack}
            style={{ marginTop: spacing['3xl'], marginBottom: spacing.xl, alignSelf: 'flex-start' }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={{ color: colors.accentPrimary, fontSize: 22 }}>←</Text>
          </Pressable>

          <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Enter the code
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'] }]}>
            Sent to {maskedPhone}
          </Text>

          {/* OTP Box Inputs */}
          <Animated.View
            style={[
              styles.otpRow,
              { gap: spacing.sm, transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(r) => { inputRefs.current[index] = r }}
                value={digit}
                onChangeText={(v) => handleDigitChange(v, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                caretHidden
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.bgTertiary,
                    borderColor: digit
                      ? colors.accentPrimary
                      : error
                      ? colors.accentDanger
                      : colors.border,
                    borderRadius: radius.md,
                    borderWidth: digit ? 1.5 : 1,
                    color: colors.textPrimary,
                    fontFamily: fonts.mono,
                    fontSize: 24,
                  },
                ]}
                accessibilityLabel={`OTP digit ${index + 1}`}
              />
            ))}
          </Animated.View>

          {/* Error */}
          {error && (
            <Text
              style={[
                text.label.md,
                { color: colors.accentDanger, marginTop: spacing.md, textAlign: 'center' },
              ]}
            >
              {error}
            </Text>
          )}

          {/* Resend */}
          <View style={[styles.resendRow, { marginTop: spacing.xl }]}>
            <Text style={[text.body.sm, { color: colors.textSecondary }]}>
              Didn't get it?{' '}
            </Text>
            {otpFlow.canResend ? (
              <Pressable onPress={handleResend} accessibilityRole="button" accessibilityLabel="Resend OTP">
                <Text style={[text.body.sm, { color: colors.accentPrimary }]}>
                  Resend OTP
                </Text>
              </Pressable>
            ) : (
              <Text style={[text.body.sm, { color: colors.textMuted }]}>
                Resend in {otpFlow.countdown}s
              </Text>
            )}
          </View>

          {/* Verify button — shown when all 6 digits entered */}
          {digits.join('').length === OTP_LENGTH && (
            <Button
              label="Verify"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={() => handleVerify()}
              style={{ marginTop: spacing.xl }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 56,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
