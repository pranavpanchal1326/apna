import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as MediaLibrary from 'expo-media-library'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { useCameraPermissions as useAppCameraPermissions } from '../../hooks/useCameraPermissions'
import { useUIStore } from '../../stores/ui.store'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface NativeCameraSheetProps {
  visible: boolean
  maxPhotos?: number          // default 10
  onCapture(uris: string[]): void
  onClose(): void
}

export function NativeCameraSheet({
  visible,
  maxPhotos = 10,
  onCapture,
  onClose,
}: NativeCameraSheetProps) {
  const { colors, text, spacing, radius } = useTheme()
  const { openSettings } = useAppCameraPermissions()
  const [permission, requestPermission] = useCameraPermissions()
  const showToast = useUIStore((s) => s.showToast)

  const [capturedUris, setCapturedUris] = useState<string[]>([])
  const [lastLibraryPhotoUri, setLastLibraryPhotoUri] = useState<string | null>(null)
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off')
  const [facing, setFacing] = useState<'back' | 'front'>('back')

  // Animation values for photo flight
  const previewAnim = useRef(new Animated.Value(0)).current // 0 = center, 1 = bottom-left
  const [animatingUri, setAnimatingUri] = useState<string | null>(null)

  const cameraRef = useRef<CameraView>(null)

  // Shutter burst mode logic
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const burstIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isBurstActive = useRef(false)

  // Fetch last library image for thumbnail fallback
  useEffect(() => {
    async function fetchLastPhoto() {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status === 'granted') {
          const { assets } = await MediaLibrary.getAssetsAsync({
            first: 1,
            sortBy: ['creationTime'],
            mediaType: ['photo'],
          })
          if (assets && assets.length > 0) {
            setLastLibraryPhotoUri(assets[0].uri)
          }
        }
      } catch (err) {
        // Ignored
      }
    }
    if (visible) {
      fetchLastPhoto()
      setCapturedUris([])
    }
  }, [visible])

  // Cleanup on unmount or hide
  useEffect(() => {
    return () => {
      stopBurstMode()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const animateThumbnail = (uri: string) => {
    setAnimatingUri(uri)
    previewAnim.setValue(0)
    Animated.spring(previewAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      setAnimatingUri(null)
      setLastLibraryPhotoUri(uri)
    })
  }

  const takePicture = async () => {
    if (!cameraRef.current) return

    if (capturedUris.length >= maxPhotos) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      showToast({ message: `Max limit of ${maxPhotos} photos reached!`, type: 'error' })
      return
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      })

      if (photo?.uri) {
        setCapturedUris((prev) => {
          if (prev.length >= maxPhotos) return prev
          const next = [...prev, photo.uri]
          animateThumbnail(photo.uri)
          return next
        })
      }
    } catch (err) {
      console.error('[NativeCameraSheet] takePictureAsync failed:', err)
    }
  }

  const startBurstMode = () => {
    isBurstActive.current = true
    takePicture() // First photo immediately

    burstIntervalRef.current = setInterval(() => {
      setCapturedUris((current) => {
        if (current.length >= maxPhotos) {
          stopBurstMode()
          return current
        }
        takePicture()
        return current
      })
    }, 850) // Capture rate
  }

  const stopBurstMode = () => {
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current)
      burstIntervalRef.current = null
    }
  }

  const handlePressIn = () => {
    if (capturedUris.length >= maxPhotos) return
    isBurstActive.current = false
    timerRef.current = setTimeout(() => {
      startBurstMode()
    }, 500)
  }

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isBurstActive.current) {
      stopBurstMode()
    } else {
      takePicture()
    }
  }

  const handleDone = () => {
    if (capturedUris.length > 0) {
      onCapture(capturedUris)
    }
    onClose()
  }

  // Animation transforms
  const translateX = previewAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH / 2 + 36 + 16],
  })

  const translateY = previewAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT / 2 - 80],
  })

  const scale = previewAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.15],
  })

  const opacity = previewAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0.8, 0],
  })

  if (!visible) return null

  // Permission views
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={[styles.center, { backgroundColor: colors.bgPrimary, padding: spacing.xl }]}>
          <Text style={{ fontSize: 64, marginBottom: spacing.md }}>📷</Text>
          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
            Camera Permission Required
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.md }]}>
            apna needs camera access so you can capture photo memories and expense receipts in the moment.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionBtn,
              { backgroundColor: colors.accentPrimary, borderRadius: radius.lg, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[text.label.lg, { color: colors.bgPrimary }]}>Allow Camera</Text>
          </Pressable>
          <Pressable
            onPress={openSettings}
            style={{ marginTop: spacing.md, padding: spacing.sm }}
          >
            <Text style={[text.label.md, { color: colors.accentPrimary }]}>Open System Settings</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={{ marginTop: spacing.xl, padding: spacing.sm }}
          >
            <Text style={[text.label.md, { color: colors.textSecondary }]}>Not Now</Text>
          </Pressable>
        </View>
      </Modal>
    )
  }

  const currentThumbnail = capturedUris.length > 0 ? capturedUris[capturedUris.length - 1] : lastLibraryPhotoUri
  const isLimitReached = capturedUris.length >= maxPhotos

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Full-screen Camera Stream */}
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={cameraRef}
          facing={facing}
          flash={flash}
        >
          {/* Viewport Overlay Controls */}
          <View style={styles.overlayContainer}>
            {/* Top Toolbar */}
            <View style={styles.topToolbar}>
              <Pressable
                onPress={onClose}
                style={styles.controlBtn}
                accessibilityLabel="Close camera"
                accessibilityRole="button"
              >
                <Text style={styles.controlText}>×</Text>
              </Pressable>

              <View style={styles.topRightControls}>
                {/* Flash Toggle */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'))
                  }}
                  style={styles.iconControlBtn}
                  accessibilityLabel="Toggle flash"
                  accessibilityRole="button"
                >
                  <Text style={styles.iconText}>
                    {flash === 'on' ? '⚡ On' : flash === 'auto' ? '⚡ Auto' : '⚡ Off'}
                  </Text>
                </Pressable>

                {/* Flip Camera */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setFacing((prev) => (prev === 'back' ? 'front' : 'back'))
                  }}
                  style={styles.iconControlBtn}
                  accessibilityLabel="Flip camera"
                  accessibilityRole="button"
                >
                  <Text style={styles.iconText}>🔄 Flip</Text>
                </Pressable>
              </View>
            </View>

            {/* In-flight spring thumbnail animation */}
            {animatingUri && (
              <Animated.View
                style={[
                  styles.animatedPreviewContainer,
                  {
                    transform: [{ translateX }, { translateY }, { scale }],
                    opacity,
                  },
                ]}
              >
                <Image source={{ uri: animatingUri }} style={styles.animatedPreview} />
              </Animated.View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomSection}>
              {/* Gallery Preview Thumbnail */}
              <View style={styles.galleryPreviewSlot}>
                {currentThumbnail ? (
                  <Image source={{ uri: currentThumbnail }} style={[styles.thumbnailImg, { borderRadius: radius.sm }]} />
                ) : (
                  <View style={[styles.thumbnailPlaceholder, { borderRadius: radius.sm, borderColor: '#FFF' }]} />
                )}
              </View>

              {/* Shutter Button */}
              <View style={styles.shutterContainer}>
                <Pressable
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={isLimitReached}
                  style={[
                    styles.shutterOuter,
                    {
                      borderColor: '#FFF',
                      opacity: isLimitReached ? 0.4 : 1,
                    },
                  ]}
                  accessibilityLabel="Capture photo"
                  accessibilityRole="button"
                >
                  <View style={[styles.shutterInner, { backgroundColor: '#FFF' }]} />
                </Pressable>
                {isBurstActive.current && (
                  <Text style={[text.label.sm, { color: '#FFF', marginTop: spacing.xs, fontWeight: '700' }]}>
                    BURST ACTIVE
                  </Text>
                )}
              </View>

              {/* Selection/Done Count Badge */}
              <Pressable
                onPress={handleDone}
                style={[
                  styles.doneBtn,
                  {
                    backgroundColor: isLimitReached ? colors.accentDanger : colors.accentPrimary,
                    borderRadius: radius.md,
                  },
                ]}
                accessibilityLabel="Confirm photos"
                accessibilityRole="button"
              >
                <Text style={[text.label.sm, { color: colors.bgPrimary, fontWeight: '700' }]}>
                  {capturedUris.length > 0 ? `DONE (${capturedUris.length})` : 'DONE'}
                </Text>
              </Pressable>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    minHeight: 48,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    height: 100,
    zIndex: 10,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  iconControlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 32,
  },
  iconText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSection: {
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  galleryPreviewSlot: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImg: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  shutterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 40,
  },
  animatedPreviewContainer: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 120,
    top: SCREEN_HEIGHT / 2 - 150,
    width: 240,
    height: 300,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  animatedPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
})
