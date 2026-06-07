// src/theme/motion.ts
// Dhaga Motion System — from PRD §7 motion principles
// "All transitions: 200–280ms ease-out"
// "Spring animations for expense additions: cubic-bezier(0.34, 1.56, 0.64, 1)"
// "No instant snaps. Everything has 12ms minimum transition."
//
// React Native uses Animated API — no CSS transitions.
// Use these configs with Animated.timing() and Animated.spring().

import { Easing } from 'react-native'

// Duration constants (ms) — from PRD §7
export const Duration = {
  instant:  12,   // Minimum — for state that feels instant but isn't jarring
  fast:     200,  // Quick interactions: button press, tab switch
  standard: 240,  // Default transition: screen slide, card expand
  slow:     280,  // Deliberate: bottom sheet open, modal appear
  pageIn:   320,  // Screen entrance
} as const

// Easing curves for Animated.timing()
// NOTE: React Native Easing doesn't support full cubic-bezier natively.
// Use .bezier() or .out() compositions.
export const Ease = {
  // Standard ease-out — use for almost everything
  out:        Easing.out(Easing.cubic),

  // Ease-in-out — for elements that start and end at rest
  inOut:      Easing.inOut(Easing.ease),

  // Sharp — for quick functional interactions (dismiss, close)
  sharp:      Easing.out(Easing.back(1.2)),

  // Decelerate — for elements entering from off-screen
  decelerate: Easing.out(Easing.exp),
} as const

// Spring configs for Animated.spring()
// "Spring animations for expense additions" — bouncy, satisfying
export const Spring = {
  // Standard spring — bottom sheet open, card pop
  standard: {
    tension:  60,
    friction: 9,
    useNativeDriver: true,
  },

  // Bouncy spring — expense added confirmation, settlement complete
  // Matches PRD: cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot by ~12%
  bouncy: {
    tension:  80,
    friction: 7,
    useNativeDriver: true,
  },

  // Gentle spring — FAB menu open, avatar entrance
  gentle: {
    tension:  40,
    friction: 10,
    useNativeDriver: true,
  },

  // Snappy spring — tab switch indicator, toggle
  snappy: {
    tension:  100,
    friction: 10,
    useNativeDriver: true,
  },
} as const

// Pre-composed Animated.timing configs — use with Animated.timing(value, config)
export const TimingConfig = {
  fast: {
    duration: Duration.fast,
    easing: Ease.out,
    useNativeDriver: true,
  },
  standard: {
    duration: Duration.standard,
    easing: Ease.out,
    useNativeDriver: true,
  },
  slow: {
    duration: Duration.slow,
    easing: Ease.inOut,
    useNativeDriver: true,
  },
  pageIn: {
    duration: Duration.pageIn,
    easing: Ease.decelerate,
    useNativeDriver: true,
  },
} as const

// Haptic feedback types — used with expo-haptics
// Wired to specific user actions (see usage comments)
export const HapticPattern = {
  light:   'light',    // Button taps, toggles
  medium:  'medium',   // Expense added, settlement recorded
  heavy:   'heavy',    // SOS sent, error (rare)
  success: 'success',  // Settlement complete, trip wrap generated
  warning: 'warning',  // Balance warning, overdue reminder
  error:   'error',    // Failed action
} as const

export type HapticPatternKey = keyof typeof HapticPattern
