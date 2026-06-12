// src/screens/auth/ProfileSetupScreen.tsx
// PRD §9.1: "Name + pick avatar color (8 preset colors)"
// "Onboarding must complete in under 60 seconds for a new user"
// No photo upload in onboarding — reduces friction (photo upload is Phase 4).

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { useTheme } from '@theme'
import { Button, Input, Avatar, Screen } from '@components'
import { useAuthStore } from '@stores/auth.store'
import { createUserDoc } from '@lib/firebase/auth'
import { AVATAR_COLORS } from '@lib/types'
import { track, identifyAnalyticsUser } from '@lib/analytics'
import { flushPendingReferralAttribution } from '@lib/firebase/referrals'

interface ProfileSetupScreenProps {
  onComplete: () => void   // Navigate to Home
}

export function ProfileSetupScreen({ onComplete }: ProfileSetupScreenProps) {
  const { colors, spacing, radius, text } = useTheme()
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const setUser = useAuthStore((s) => s.setUser)

  const isNameValid = name.trim().length >= 2 && name.trim().length <= 40
  const canSubmit = isNameValid && selectedColor

  const handleColorSelect = useCallback((color: string) => {
    Haptics.selectionAsync()
    setSelectedColor(color)
  }, [])

  const handleCreateProfile = useCallback(async () => {
    if (!canSubmit || !firebaseUser) return
    setError(null)
    setIsLoading(true)

    try {
      const user = await createUserDoc(firebaseUser, name.trim(), selectedColor)
      
      track('profile_created', {
        avatar_color: selectedColor,
        name_length: name.trim().length,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? '1.0.0',
        step_index: 3,
      })

      setUser(user)
      identifyAnalyticsUser(user.uid)
      void flushPendingReferralAttribution(user.uid)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onComplete()
    } catch {
      setError('Couldn\'t save your profile. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [canSubmit, firebaseUser, name, selectedColor, setUser, onComplete])

  return (
    <Screen edges={['top', 'left', 'right']}>
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
          <Text
            style={[
              text.display.sm,
              { color: colors.textPrimary, marginBottom: spacing.sm },
            ]}
          >
            What should{'\n'}we call you?
          </Text>

          <Text
            style={[
              text.body.md,
              { color: colors.textSecondary, marginBottom: spacing['2xl'] },
            ]}
          >
            Pick a color that's yours in the group.
          </Text>

          {/* Live avatar preview */}
          <View style={[styles.previewRow, { marginBottom: spacing['2xl'] }]}>
            <Avatar
              name={name.trim() || 'A'}
              color={selectedColor}
              size="xl"
            />
          </View>

          {/* Name input */}
          <Input
            label="Your name"
            type="text"
            value={name}
            onChangeText={(v: string) => {
              setName(v)
              if (error) setError(null)
            }}
            placeholder="e.g. Pranav, Riya, Arjun"
            error={error ?? undefined}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreateProfile}
            maxLength={40}
          />

          {/* Color picker */}
          <Text
            style={[
              text.label.md,
              {
                color: colors.textSecondary,
                marginTop: spacing.xl,
                marginBottom: spacing.md,
              },
            ]}
          >
            Pick your colour
          </Text>

          <View style={styles.colorGrid}>
            {AVATAR_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => handleColorSelect(color)}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color,
                    borderRadius: radius.full,
                    borderWidth: selectedColor === color ? 3 : 0,
                    borderColor: colors.bgPrimary,
                    // Ring effect via shadow when selected
                    ...(selectedColor === color
                      ? {
                          shadowColor: color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 8,
                          elevation: 8,
                        }
                      : {}),
                  },
                ]}
                accessible
                accessibilityRole="radio"
                accessibilityLabel={`Avatar color ${color}`}
                accessibilityState={{ selected: selectedColor === color }}
              />
            ))}
          </View>

          <Button
            label="Let's go →"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!canSubmit}
            onPress={handleCreateProfile}
            style={{ marginTop: spacing['2xl'] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  previewRow: {
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  colorSwatch: {
    width: 48,
    height: 48,
  },
})
