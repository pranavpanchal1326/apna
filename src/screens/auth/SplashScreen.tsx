// src/screens/auth/SplashScreen.tsx
// PRD §9.1: "Splash screen — logo draws in 0.8s, fades out"
// First screen the user sees on every cold launch.
// Also shown while auth state is initializing.

import { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, Dimensions } from 'react-native'
import { useTheme } from '@theme'

const { width } = Dimensions.get('window')
const LOGO_SIZE = width * 0.28  // ~30% of screen width

interface SplashScreenProps {
  onComplete: () => void   // Called after animation — navigates to next screen
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { colors } = useTheme()

  // Logo animation values
  const drawProgress = useRef(new Animated.Value(0)).current
  const logoOpacity  = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(1)).current
  const logoScale    = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.sequence([
      // Phase 1: Logo fades + scales in (0–300ms)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Draw progress animates (300–1100ms = 800ms draw)
      Animated.timing(drawProgress, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false, // strokeDashoffset/width can't use native driver
      }),
      // Phase 3: Hold (400ms)
      Animated.delay(400),
      // Phase 4: Fade out entire screen (200ms)
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete())
  }, [logoOpacity, logoScale, drawProgress, screenOpacity, onComplete])

  // Underline draw — the Dhaga thread under "apna"
  const underlineWidth = drawProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOGO_SIZE],
  })

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgPrimary,
          opacity: screenOpacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Wordmark: "apna" in Outfit Bold */}
        <Animated.Text
          style={{
            fontSize: 52,
            fontFamily: 'Outfit-Bold',
            color: colors.textPrimary,
            letterSpacing: -1.5,
            lineHeight: 60,
          }}
        >
          apna
        </Animated.Text>

        {/* Dhaga thread underline — draws left to right */}
        <View style={styles.underlineTrack}>
          <Animated.View
            style={[
              styles.underline,
              {
                width: underlineWidth,
                backgroundColor: colors.accentPrimary,
              },
            ]}
          />
        </View>

        {/* Tagline — fades in with logo */}
        <Animated.Text
          style={{
            fontSize: 13,
            fontFamily: 'Outfit-Regular',
            color: colors.textSecondary,
            letterSpacing: 0.5,
            marginTop: 12,
          }}
        >
          our own
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  underlineTrack: {
    width: LOGO_SIZE,
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  underline: {
    height: 3,
    borderRadius: 2,
  },
})
