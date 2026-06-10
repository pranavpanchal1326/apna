// src/screens/expense/components/ReceiptViewer.tsx
// Full-screen receipt photo viewer Modal.
// Supports gesture-based pinch-to-zoom (Reanimated 3 + RNGH 2) and delete actions.

import { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '@theme'
import { useAuth } from '@hooks/useAuth'
import { useGroupStore } from '@stores/group.store'
import { useExpenseStore } from '@stores/expense.store'
import { deleteReceiptPhoto } from '@lib/firebase/storage'
import { attachReceiptURL } from '@lib/firebase/expenses'

interface ReceiptViewerProps {
  visible: boolean
  onClose: () => void
  receiptUrl: string
  groupId: string
  expenseId: string
  createdBy: string // UID of the expense creator
  onDeleteComplete?: () => void
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export function ReceiptViewer({
  visible,
  onClose,
  receiptUrl,
  groupId,
  expenseId,
  createdBy,
  onDeleteComplete,
}: ReceiptViewerProps) {
  const { colors, text, spacing, radius } = useTheme()
  const { user } = useAuth()
  const activeGroup = useGroupStore((s) => s.activeGroup)

  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Gestures & Zoom ──────────────────────────────────────────────
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)

  const translateX = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)

  const translateY = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  // Double tap to toggle 1.0x <-> 2.5x zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1)
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        savedScale.value = 1
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else {
        scale.value = withTiming(2.5)
        savedScale.value = 2.5
      }
    })

  // Pinch gesture (min 1.0x, max 4.0x)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value
    })
    .onUpdate((event) => {
      // Allow temporary scale below 1 or above 4 during active gesture
      scale.value = Math.max(0.7, Math.min(savedScale.value * event.scale, 5))
    })
    .onEnd(() => {
      if (scale.value < 1.0) {
        scale.value = withTiming(1)
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        savedScale.value = 1
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else if (scale.value > 4.0) {
        scale.value = withTiming(4)
        savedScale.value = 4
      } else {
        savedScale.value = scale.value
      }
    })

  // Pan gesture (only works when scale > 1.0)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })
    .onUpdate((event) => {
      if (scale.value > 1.0) {
        translateX.value = savedTranslateX.value + event.translationX
        translateY.value = savedTranslateY.value + event.translationY
      }
    })
    .onEnd(() => {
      if (scale.value <= 1.0) {
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else {
        savedTranslateX.value = translateX.value
        savedTranslateY.value = translateY.value
      }
    })

  // Combine gestures
  const composedGesture = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  )

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }
  })

  // ── Access check ──────────────────────────────────────────────────
  const myUid = user?.uid ?? ''
  const isCreator = createdBy === myUid
  const isAdmin = activeGroup?.adminIds?.includes(myUid) || activeGroup?.createdBy === myUid
  const canDelete = isCreator || isAdmin

  const handleDelete = () => {
    Alert.alert(
      'Delete Receipt?',
      'Are you sure you want to delete this receipt photo? This will permanently remove the receipt attachment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              // Delete from Firebase Storage
              await deleteReceiptPhoto(receiptUrl)
              // Update Firestore doc to null/empty string
              await attachReceiptURL(groupId, expenseId, '')
              
              // Patch local store
              useExpenseStore.setState((state) => ({
                expensesByGroup: {
                  ...state.expensesByGroup,
                  [groupId]: (state.expensesByGroup[groupId] ?? []).map((e) =>
                    e.id === expenseId ? { ...e, receiptUrl: undefined } : e
                  ),
                },
              }))

              onDeleteComplete?.()
              onClose()
            } catch (err) {
              console.error('[ReceiptViewer] Delete failed:', err)
              Alert.alert('Error', 'Failed to delete the receipt photo.')
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Header toolbar */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={[styles.btn, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: radius.full }]}
          >
            <Text style={styles.btnText}>×</Text>
          </Pressable>

          {canDelete && (
            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              style={[
                styles.deleteBtn,
                { backgroundColor: `${colors.accentDanger}30`, borderRadius: radius.md, paddingHorizontal: spacing.md },
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.accentDanger} />
              ) : (
                <Text style={[text.label.md, { color: colors.accentDanger }]}>Delete</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFF" style={styles.centerSpinner} />
          </View>
        )}

        {/* Interactive Image */}
        <GestureDetector gesture={composedGesture}>
          <Animated.Image
            source={{ uri: receiptUrl }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
        </GestureDetector>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
  },
  deleteBtn: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centerSpinner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
})
