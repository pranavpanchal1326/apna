import { View, Text, StyleSheet, Linking } from 'react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { useTheme } from '../../theme'
import { useBackgroundLocation } from '../../hooks/useBackgroundLocation'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface LocationPermissionGateProps {
  visible: boolean
  onClose: () => void
}

export function LocationPermissionGate({ visible, onClose }: LocationPermissionGateProps) {
  const { colors, text, spacing, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { permissionStatus, requestPermissions } = useBackgroundLocation()

  const isBackgroundState = permissionStatus === 'foreground_only'

  const handleAllow = async () => {
    if (isBackgroundState) {
      await Linking.openSettings()
      onClose()
    } else {
      await requestPermissions()
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isBackgroundState ? 'Background Location' : 'Location Required'}
    >
      <View style={[styles.container, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}>
          <Text style={styles.icon}>
            {isBackgroundState ? '🔒📍' : '📍'}
          </Text>
        </View>

        {/* Content */}
        <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
          {isBackgroundState ? 'Allow "All the time" Location' : 'Allow Foreground Location'}
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.sm, paddingHorizontal: spacing.md }]}>
          {isBackgroundState
            ? "To share your location when apna is in the background, you must set location access to 'Allow all the time' in your device settings."
            : "apna needs foreground location permissions to locate you and coordinate with friends during the trip."}
        </Text>

        {/* CTAs */}
        <View style={styles.actions}>
          <Button
            label={isBackgroundState ? 'Open Settings' : 'Allow Access'}
            onPress={handleAllow}
            variant="primary"
            style={{ width: '100%' }}
          />
          <Button
            label={isBackgroundState ? 'Use Foreground Only' : 'Not Now'}
            onPress={onClose}
            variant="ghost"
            style={{ width: '100%', marginTop: spacing.xs }}
            textStyle={{ color: colors.accentDanger }}
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
