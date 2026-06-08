// src/screens/group/CreateGroupScreen.tsx
// PRD §9.2: "Create group — name, destination, dates, cover emoji"
// Multi-step: reduces cognitive load, each step is simple.
// Step 1: name + emoji picker
// Step 2: destination + dates (optional) + budget (optional)
// Step 3: review + create

import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Button, Input, Screen } from '@components'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackParamList } from '@navigation/types'

type Nav = NativeStackNavigationProp<HomeStackParamList>

const EMOJI_OPTIONS = [
  '✈️','🏖️','🏔️','🌴','🗺️','🎒',
  '🏕️','🚢','🚂','🏝️','🌏','🎡',
]

const STEPS = ['Name', 'Details', 'Confirm'] as const

export function CreateGroupScreen() {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const navigation = useNavigation<Nav>()
  const { user }   = useAuth()
  const { createGroup, isCreating } = useGroupStore()

  const [step, setStep]               = useState(0)
  const [name, setName]               = useState('')
  const [emoji, setEmoji]             = useState('✈️')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [budget, setBudget]           = useState('')
  const [error, setError]             = useState<string | null>(null)

  // Progress indicator animation
  const progressAnim = useRef(new Animated.Value(0)).current

  const animateToStep = useCallback((nextStep: number) => {
    Animated.timing(progressAnim, {
      toValue: nextStep / (STEPS.length - 1),
      duration: 240,
      useNativeDriver: false,
    }).start()
    setStep(nextStep)
  }, [progressAnim])

  const handleNext = useCallback(() => {
    setError(null)
    if (step === 0) {
      if (name.trim().length < 2) {
        setError('Group name must be at least 2 characters.')
        return
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      animateToStep(1)
    } else if (step === 1) {
      // Validate date logic if both provided
      if (startDate && endDate && startDate > endDate) {
        setError('End date must be after start date.')
        return
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      animateToStep(2)
    }
  }, [step, name, startDate, endDate, animateToStep])

  const handleBack = useCallback(() => {
    if (step === 0) {
      navigation.goBack()
    } else {
      animateToStep(step - 1)
    }
  }, [step, navigation, animateToStep])

  const handleCreate = useCallback(async () => {
    if (!user?.uid) return
    setError(null)

    try {
      const result = await createGroup({
        name:        name.trim(),
        destination: destination.trim() || undefined,
        startDate:   startDate || undefined,
        endDate:     endDate   || undefined,
        coverEmoji:  emoji,
        currency:    'INR',
        totalBudget: budget ? parseFloat(budget) : undefined,
        creatorUid:  user.uid,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Replace screen in stack with the new group home
      navigation.replace('GroupHome', {
        groupId:   result.groupId,
        groupName: name.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.')
    }
  }, [user, name, destination, startDate, endDate, emoji, budget, createGroup, navigation])

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={{ color: colors.accentPrimary, fontSize: 22 }}>←</Text>
          </Pressable>

          <Text style={[text.label.lg, { color: colors.textSecondary }]}>
            {STEPS[step]}
          </Text>

          <View style={{ width: 32 }} />
        </View>

        {/* Progress bar — Dhaga thread */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: colors.border,
              marginHorizontal: spacing.lg,
              marginTop: spacing.md,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width:           progressWidth,
                backgroundColor: colors.accentPrimary,
              },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 0: Name + Emoji ───────────────────────────── */}
          {step === 0 && (
            <>
              <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
                Name your{'\n'}group
              </Text>
              <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'] }]}>
                Keep it fun — this is what your squad sees.
              </Text>

              <Input
                label="Group name"
                value={name}
                onChangeText={(v) => { setName(v); setError(null) }}
                placeholder="e.g. Goa 2026, Manali Crew"
                error={error ?? undefined}
                autoFocus
                maxLength={60}
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />

              {/* Emoji picker */}
              <Text
                style={[
                  text.label.md,
                  { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md },
                ]}
              >
                Pick a cover
              </Text>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      Haptics.selectionAsync()
                      setEmoji(e)
                    }}
                    style={[
                      styles.emojiBtn,
                      {
                        backgroundColor: emoji === e ? colors.bgTertiary : 'transparent',
                        borderRadius:    radius.md,
                        borderWidth:     emoji === e ? 1.5 : 1,
                        borderColor:     emoji === e ? colors.accentPrimary : colors.border,
                        width:           52,
                        height:          52,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={`Cover emoji ${e}`}
                    accessibilityState={{ selected: emoji === e }}
                  >
                    <Text style={{ fontSize: 26 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* ── Step 1: Destination + Dates + Budget ────────────── */}
          {step === 1 && (
            <>
              <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
                Where and{'\n'}when?
              </Text>
              <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'] }]}>
                Optional — you can always add this later.
              </Text>

              <Input
                label="Destination"
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Goa, Manali, Bali"
                maxLength={80}
                returnKeyType="next"
              />

              <View style={{ marginTop: spacing.lg }}>
                <Input
                  label="Start date"
                  value={startDate}
                  onChangeText={(v) => { setStartDate(v); setError(null) }}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  keyboardType="numeric"
                  returnKeyType="next"
                  error={error && startDate ? error : undefined}
                />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Input
                  label="End date"
                  value={endDate}
                  onChangeText={(v) => { setEndDate(v); setError(null) }}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  keyboardType="numeric"
                  returnKeyType="next"
                  error={error && endDate ? error : undefined}
                />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Input
                  label="Total budget (optional)"
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="e.g. 25000"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
            </>
          )}

          {/* ── Step 2: Confirm / Review ───────────────────────── */}
          {step === 2 && (
            <>
              <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
                Review squad{'\n'}details
              </Text>
              <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'] }]}>
                Almost there! Double check details before launching.
              </Text>

              <View
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderRadius:    radius.lg,
                    borderColor:     colors.border,
                    padding:         spacing.lg,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                  <View
                    style={[
                      styles.emojiContainer,
                      {
                        backgroundColor: colors.bgTertiary,
                        borderRadius:    radius.md,
                        width:  56,
                        height: 56,
                        marginRight: spacing.md,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 30 }}>{emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[text.heading.sm, { color: colors.textPrimary }]} numberOfLines={1}>
                      {name}
                    </Text>
                    {destination ? (
                      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        📍 {destination}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {(startDate || endDate) && (
                  <View style={[styles.reviewRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginBottom: spacing.md }]}>
                    <Text style={[text.label.md, { color: colors.textSecondary, flex: 1 }]}>Dates</Text>
                    <Text style={[text.body.md, { color: colors.textPrimary }]}>
                      {startDate || '—'} to {endDate || '—'}
                    </Text>
                  </View>
                )}

                {budget && (
                  <View style={[styles.reviewRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
                    <Text style={[text.label.md, { color: colors.textSecondary, flex: 1 }]}>Budget</Text>
                    <Text style={[text.body.md, { color: colors.textPrimary }]}>
                      ₹{parseFloat(budget).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs }]}>
          {error && (
            <Text style={[text.body.sm, { color: colors.accentDanger, marginBottom: spacing.md, textAlign: 'center' }]}>
              {error}
            </Text>
          )}
          {step < 2 ? (
            <Button
              label="Continue"
              onPress={handleNext}
            />
          ) : (
            <Button
              label="Create Group"
              onPress={handleCreate}
              loading={isCreating}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  progressTrack: {
    height: 3,
    overflow: 'hidden',
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
  },
  content: {
    paddingBottom: 40,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    borderWidth: 1,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    width: '100%',
  },
})
