// src/components/ui/BottomSheet.tsx
// React Native BottomSheet — built without external library to avoid
// native module complexity in Expo Managed. Uses Animated + Modal.
// For complex gesture-driven sheets (Phase 3+), upgrade to @gorhom/bottom-sheet.

import { useEffect, useRef, useCallback } from 'react'
import {
  Animated,
  Modal,
  Pressable,
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@theme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapHeight?: number        // Fixed height in px. Default: auto (max 80% screen)
  disableBackdropClose?: boolean
  style?: ViewStyle
}

export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  snapHeight,
  disableBackdropClose = false,
  style,
}: BottomSheetProps) {
  const { colors, spacing, radius, shadows, text, spring, timing } = useTheme()
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  // ── Open animation ────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          ...spring.standard,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          ...timing.standard,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          ...timing.fast,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          ...timing.fast,
        }),
      ]).start()
    }
  }, [visible, slideAnim, backdropOpacity, spring, timing])

  const handleBackdropPress = useCallback(() => {
    if (!disableBackdropClose) onClose()
  }, [disableBackdropClose, onClose])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Scrim backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: colors.scrim, opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={styles.backdropPressable}
            onPress={handleBackdropPress}
            accessible
            accessibilityLabel="Close sheet"
            accessibilityRole="button"
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgSecondary,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: SCREEN_HEIGHT * 0.88,
              ...(snapHeight ? { height: snapHeight } : {}),
              transform: [{ translateY: slideAnim }],
              ...shadows.bottomSheet,
            },
            style,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.border },
              ]}
            />
          </View>

          {/* Optional title */}
          {title && (
            <View
              style={[
                styles.titleRow,
                {
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <Animated.Text
                style={[
                  text.heading.sm,
                  { color: colors.textPrimary },
                ]}
              >
                {title}
              </Animated.Text>
            </View>
          )}

          {/* Content */}
          <View style={{ flex: 1, overflow: 'hidden' }}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    width: '100%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    paddingTop: 4,
  },
})
