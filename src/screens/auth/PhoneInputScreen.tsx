// src/screens/auth/PhoneInputScreen.tsx
// PRD §9.1: Phone number entry — +91 prefix, 10-digit validation, send OTP.
// FirebaseRecaptchaVerifierModal handles reCAPTCHA invisibly in background.

import { useRef, useCallback, useState } from 'react'
import {
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'
import Constants from 'expo-constants'
import { useTheme } from '@theme'
import { Button, Input, Screen } from '@components'
import { useAuthStore } from '@stores/auth.store'
import { sendOTP } from '@lib/firebase/auth'
import type { RecaptchaRef } from '@lib/firebase/auth'

interface PhoneInputScreenProps {
  onOTPSent: () => void       // Navigate to OTPScreen
}

export function PhoneInputScreen({ onOTPSent }: PhoneInputScreenProps) {
  const { colors, spacing, text } = useTheme()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null)
  const setOTPVerificationId = useAuthStore((s) => s.setOTPVerificationId)
  const startResendCountdown = useAuthStore((s) => s.startResendCountdown)

  // Validation
  const isValid = /^[6-9]\d{9}$/.test(phone.trim())

  const handleSendOTP = useCallback(async () => {
    if (!isValid) {
      setError('Enter a valid 10-digit Indian mobile number')
      return
    }
    setError(null)
    setIsLoading(true)

    try {
      const verificationId = await sendOTP(phone.trim(), recaptchaRef as RecaptchaRef)
      setOTPVerificationId(verificationId, phone.trim())
      startResendCountdown()
      onOTPSent()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP'
      // User-friendly error messages — no raw Firebase error codes
      if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a few minutes.')
      } else if (msg.includes('invalid-phone-number')) {
        setError('This number doesn\'t look right. Check and try again.')
      } else {
        setError('Couldn\'t send OTP. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [phone, isValid, recaptchaRef, setOTPVerificationId, startResendCountdown, onOTPSent])

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Firebase reCAPTCHA — invisible, required for phone auth in RN */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={Constants.expoConfig?.extra as Record<string, string>}
        attemptInvisibleVerification
        title="Verify you're human"
        cancelLabel="Cancel"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: spacing['2xl'], paddingTop: spacing['4xl'] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header copy */}
          <Text
            style={[
              text.display.sm,
              { color: colors.textPrimary, marginBottom: spacing.sm },
            ]}
          >
            What's your{'\n'}number?
          </Text>

          <Text
            style={[
              text.body.md,
              {
                color: colors.textSecondary,
                marginBottom: spacing['3xl'],
                maxWidth: 280,
              },
            ]}
          >
            We'll send a one-time code. No passwords. Ever.
          </Text>

          {/* Phone input */}
          <Input
            type="phone"
            label="Mobile number"
            value={phone}
            onChangeText={(val: string) => {
              setPhone(val.replace(/\D/g, ''))
              if (error) setError(null)
            }}
            error={error ?? undefined}
            placeholder="98765 43210"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
            maxLength={10}
          />

          {/* Terms */}
          <Text
            style={[
              text.label.sm,
              {
                color: colors.textMuted,
                marginTop: spacing.lg,
                textAlign: 'center',
                lineHeight: 18,
              },
            ]}
          >
            By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy
          </Text>

          {/* CTA */}
          <Button
            label="Send OTP"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!isValid}
            onPress={handleSendOTP}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
})
