import { useEffect } from 'react'
import { View, Text, StyleSheet, Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { useTheme } from '../../theme'

interface MediaPickerSheetProps {
  visible: boolean
  maxPhotos?: number          // default 10
  onSelect(uris: string[]): void
  onClose(): void
}

export function MediaPickerSheet({
  visible,
  maxPhotos = 10,
  onSelect,
  onClose,
}: MediaPickerSheetProps) {
  const { colors, text, spacing, radius } = useTheme()
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions()

  const launchPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos,
        quality: 1, // High quality, client side compression handles size later
      })

      if (result.canceled || !result.assets) {
        onClose()
        return
      }

      const uris = result.assets.map((asset) => asset.uri)
      onSelect(uris)
      onClose()
    } catch (err) {
      console.error('[MediaPickerSheet] Error launching image picker:', err)
      onClose()
    }
  }

  // Trigger gallery picker immediately on mount if permission granted
  useEffect(() => {
    if (visible && status?.granted) {
      launchPicker()
    }
  }, [visible, status?.granted])

  if (!visible) return null

  // If already granted, we don't show the permission modal sheet
  if (status?.granted) return null

  // If permission is denied or undetermined, show descriptive BottomSheet
  const isDenied = status && !status.granted && !status.canAskAgain

  const handleAction = async () => {
    if (isDenied) {
      Linking.openSettings()
      onClose()
    } else {
      const res = await requestPermission()
      if (res.granted) {
        launchPicker()
      }
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Gallery Permission">
      <View style={[styles.container, { paddingBottom: spacing.xl }]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}>
          <Text style={styles.icon}>🖼️</Text>
        </View>

        {/* Content */}
        <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
          Gallery Access Required
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.sm, paddingHorizontal: spacing.md }]}>
          apna needs photo library access to choose and add trip memories from your gallery.
        </Text>

        {/* Action Button */}
        <View style={styles.actions}>
          <Button
            label={isDenied ? 'Open Settings' : 'Allow Access'}
            onPress={handleAction}
            variant="primary"
            style={{ width: '100%' }}
          />
          <Button
            label="Cancel"
            onPress={onClose}
            variant="ghost"
            style={{ width: '100%', marginTop: spacing.xs }}
            textStyle={{ color: colors.textSecondary }}
          />
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },
  actions: {
    width: '100%',
    marginTop: 16,
  },
})
