// src/components/ui/Sheet.tsx
// Rebuilt bottom sheet — Blueprint §3.0.6. 28pt top radius (radius.sheet),
// bgTertiary surface, 36×4pt handle in textMuted at 40%, Spring.standard
// rise with scrim fading in parallel at 60% speed, velocity drag-dismiss
// (a flick dismisses fast), scrim tap-dismiss, keyboard-avoiding by default.
// A sheet is the ONLY floating layer that casts a shadow (§2.3.3), and only
// one floating layer may be visible at a time (§2.4).

import React, { useCallback, useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@theme'
import { SheetShadow } from '../../theme/spacing'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 0.8

interface SheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  /** Fixed height in px. Default: auto (max 88% screen). */
  snapHeight?: number
  disableBackdropClose?: boolean
  style?: ViewStyle
}

export function Sheet({
  visible,
  onClose,
  children,
  title,
  snapHeight,
  disableBackdropClose = false,
  style,
}: SheetProps) {
  const { colors, spacing, radius, text, spring, timing, isDark } = useTheme()
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const scrimOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, ...spring.standard }),
        // scrim fades in parallel at 60% speed (§2.7.2 rule 3)
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: Math.round(timing.standard.duration / 0.6),
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, ...timing.fast }),
        Animated.timing(scrimOpacity, { toValue: 0, ...timing.fast }),
      ]).start()
    }
  }, [visible, translateY, scrimOpacity, spring, timing])

  // Drag-to-dismiss with velocity handoff — a flick dismisses fast
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: Math.max(80, 200 - g.vy * 40),
            useNativeDriver: true,
          }).start(onClose)
        } else {
          Animated.spring(translateY, { toValue: 0, ...{ tension: 100, friction: 10, useNativeDriver: true } }).start()
        }
      },
    })
  ).current

  const handleBackdrop = useCallback(() => {
    if (!disableBackdropClose) onClose()
  }, [disableBackdropClose, onClose])

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.scrim, opacity: scrimOpacity }]}>
          <Pressable
            style={styles.flex}
            onPress={handleBackdrop}
            accessible
            accessibilityLabel="Close sheet"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgTertiary,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              maxHeight: SCREEN_HEIGHT * 0.88,
              ...(snapHeight ? { height: snapHeight } : {}),
              transform: [{ translateY }],
              ...(isDark ? SheetShadow.dark : SheetShadow.light),
            },
            style,
          ]}
        >
          {/* Handle — 36×4, textMuted at 40% */}
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
          </View>

          {title && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{title}</Text>
            </View>
          )}

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill as object },
  sheet: { width: '100%' },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2 },
  content: { flexShrink: 1, overflow: 'hidden' },
})
