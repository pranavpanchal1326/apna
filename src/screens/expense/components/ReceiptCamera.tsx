// src/screens/expense/components/ReceiptCamera.tsx
// Renders the camera viewport with a translucent card alignment overlay guide.
// Uses Expo Camera's CameraView (SDK 52+). Front camera disabled.

import { useRef } from 'react'
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'

interface ReceiptCameraProps {
  onCapture: (uri: string) => void
  onClose: () => void
}

export function ReceiptCamera({ onCapture, onClose }: ReceiptCameraProps) {
  const { colors, text, spacing, radius } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const handleCapture = async () => {
    if (!cameraRef.current) return
    try {
      // Light haptic tap on trigger press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      })
      
      if (photo?.uri) {
        onCapture(photo.uri)
      }
    } catch (err) {
      console.error('[ReceiptCamera] Failed to capture photo:', err)
    }
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgPrimary, padding: spacing.xl }]}>
        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📷</Text>
        <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
          Camera Access Required
        </Text>
        <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
          Please allow camera access so we can scan and attach your receipt photos to expenses.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accentPrimary, borderRadius: radius.lg, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={[text.label.lg, { color: colors.bgPrimary }]}>Grant Permission</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: spacing.md }}>
          <Text style={[text.label.md, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        ref={cameraRef}
      >
        {/* Card guide alignment overlay */}
        <View style={styles.overlayContainer}>
          {/* Top section */}
          <View style={styles.outerBlock} />

          {/* Middle section with guide bounds */}
          <View style={styles.middleRow}>
            <View style={styles.outerSideBlock} />
            <View style={[styles.guideBox, { borderColor: colors.border, borderRadius: radius.md }]}>
              {/* Highlighted accent corners */}
              <View style={[styles.cornerTL, { borderColor: colors.accentPrimary }]} />
              <View style={[styles.cornerTR, { borderColor: colors.accentPrimary }]} />
              <View style={[styles.cornerBL, { borderColor: colors.accentPrimary }]} />
              <View style={[styles.cornerBR, { borderColor: colors.accentPrimary }]} />
            </View>
            <View style={styles.outerSideBlock} />
          </View>

          {/* Bottom section with trigger */}
          <View style={styles.bottomBlock}>
            <Text style={[text.body.sm, { color: '#FFF', textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xl }]}>
              Align receipt inside the frame
            </Text>

            <View style={styles.controlsRow}>
              <Pressable
                onPress={handleCapture}
                style={({ pressed }) => [
                  styles.captureBtnOuter,
                  { borderColor: '#FFF', opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <View style={[styles.captureBtnInner, { backgroundColor: '#FFF' }]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Close Button top-left */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: radius.full }]}
        >
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '600' }}>×</Text>
        </Pressable>
      </CameraView>
    </View>
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
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  overlayContainer: {
    flex: 1,
  },
  outerBlock: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 380,
  },
  outerSideBlock: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  guideBox: {
    width: 280,
    height: 380,
    borderWidth: 1.5,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomBlock: {
    flex: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  captureBtnOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    left: 24,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
})
