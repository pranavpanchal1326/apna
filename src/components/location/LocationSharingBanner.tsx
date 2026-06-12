import { useEffect, useRef } from 'react'
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '../../theme'
import { useBackgroundLocation } from '../../hooks/useBackgroundLocation'

export function LocationSharingBanner() {
  const { colors, spacing, radius, text } = useTheme()
  const { isSharing, remainingMs, stopSharing } = useBackgroundLocation()

  const slideAnim = useRef(new Animated.Value(-64)).current
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  // Pulsing Dot Animation
  useEffect(() => {
    if (isSharing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    }
  }, [isSharing, pulseAnim])

  // Slide Animation on Sharing status
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSharing ? 0 : -64,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isSharing, slideAnim])

  if (!isSharing) return null

  const formatRemainingTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return hrs > 0 ? `${hrs}h ${remMins}m remaining` : `${remMins}m remaining`
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.bgSecondary,
          borderLeftColor: colors.accentPrimary,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left side: Pulsing dot & status */}
      <View style={styles.left}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: colors.accentPrimary,
              opacity: pulseAnim,
              borderRadius: radius.full,
            },
          ]}
        />
        <Text style={[text.label.md, { color: colors.textPrimary, fontFamily: 'Outfit' }]}>
          Sharing Location
        </Text>
      </View>

      {/* Right side: Time remaining & Stop button */}
      <View style={styles.right}>
        <Text style={[text.mono.sm, { color: colors.textMuted, marginRight: spacing.sm }]}>
          {formatRemainingTime(remainingMs)}
        </Text>
        <Pressable
          onPress={stopSharing}
          style={[
            styles.stopButton,
            {
              backgroundColor: colors.accentDanger + '20',
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            },
          ]}
          accessibilityLabel="Stop location sharing"
          accessibilityRole="button"
        >
          <Text style={[text.label.sm, { color: colors.accentDanger, fontWeight: '700' }]}>
            STOP
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    height: 48,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    marginRight: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    minWidth: 44,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
