// src/screens/itinerary/ConfirmItemButton.tsx
// Animated confirm CTA — converts a tentative item to confirmed.
//
// ANIMATION SEQUENCE (on press):
//   1. Scale: 1.0 → 1.08 → 1.0 (Spring.bouncy — overshoot effect)
//   2. Border: dashed → solid (CSS borderStyle doesn't animate in RN — swap instantly)
//   3. Teal ring pulse: accentPrimary ring expands from center then fades (Animated.sequence)
//   4. Checkmark fades in at center
//   5. Haptic: HapticPattern.success
//
// After animation completes → calls onConfirm()
// Disabled state: shows "Confirming..." with ActivityIndicator

import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useTheme } from '../../theme'

interface ConfirmItemButtonProps {
  onConfirm:  () => Promise<void>
  disabled?:  boolean
}

export function ConfirmItemButton({ onConfirm, disabled }: ConfirmItemButtonProps) {
  const { colors, text, spacing, radius, spring, duration } = useTheme()
  const [confirming, setConfirming] = useState(false)

  // Animation values
  const scaleAnim     = useRef(new Animated.Value(1)).current
  const ringScale     = useRef(new Animated.Value(0.6)).current
  const ringOpacity   = useRef(new Animated.Value(0)).current
  const checkOpacity  = useRef(new Animated.Value(0)).current

  async function handlePress() {
    if (disabled || confirming) return
    setConfirming(true)

    // 1. Haptic
    ReactNativeHapticFeedback.trigger('notificationSuccess')

    // 2. Scale bounce
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      ...spring.bouncy,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...spring.snappy,
        useNativeDriver: true,
      }).start()
    })

    // 3. Ring pulse — expand + fade out
    Animated.parallel([
      Animated.timing(ringScale, {
        toValue:         1.6,
        duration:        duration.slow,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(ringOpacity, {
          toValue:         0.6,
          duration:        duration.fast / 2,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue:         0,
          duration:        duration.slow,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    // 4. Checkmark fade in
    Animated.timing(checkOpacity, {
      toValue:         1,
      duration:        duration.standard,
      delay:           duration.fast,
      useNativeDriver: true,
    }).start()

    // 5. Fire Firestore write
    try {
      await onConfirm()
    } catch {
      // Reset animations on error
      scaleAnim.setValue(1)
      ringScale.setValue(0.6)
      ringOpacity.setValue(0)
      checkOpacity.setValue(0)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || confirming}
      accessibilityRole="button"
      accessibilityLabel="Confirm this stop"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: colors.bgTertiary,
            borderColor:     colors.accentPrimary,
            borderWidth:     1.5,
            borderRadius:    radius.md,
            paddingVertical:   spacing.md,
            paddingHorizontal: spacing.xl,
            transform:       [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Ring pulse layer — behind button content */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius:    radius.md,
              borderWidth:     2,
              borderColor:     colors.accentPrimary,
              transform:       [{ scale: ringScale }],
              opacity:         ringOpacity,
            },
          ]}
          pointerEvents="none"
        />

        {/* Button content */}
        <View style={styles.content}>
          {confirming ? (
            <ActivityIndicator size="small" color={colors.accentPrimary} />
          ) : (
            <>
              <Animated.Text
                style={[
                  styles.check,
                  { opacity: checkOpacity },
                ]}
              >
                ✓
              </Animated.Text>
              <Text
                style={[
                  text.body.md,
                  { color: colors.accentPrimary, fontWeight: '600' },
                ]}
              >
                {confirming ? 'Confirming...' : 'Lock it in ✓'}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems:  'center',
    overflow:    'visible',
    position:    'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  check: {
    fontSize:  18,
    color:     '#4ECDC4',
    position:  'absolute',
    left:      -28,
  },
})
