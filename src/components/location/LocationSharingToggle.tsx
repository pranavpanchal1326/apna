import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '../../theme'
import { useBackgroundLocation } from '../../hooks/useBackgroundLocation'
import { LocationPermissionGate } from './LocationPermissionGate'
import { haptics } from '@lib/haptics'

export function LocationSharingToggle() {
  const { colors, text, spacing, radius } = useTheme()
  const { isSharing, permissionStatus, startSharing, stopSharing } = useBackgroundLocation()
  const [gateVisible, setGateVisible] = useState(false)

  const handleToggleSharing = async () => {
    if (isSharing) {
      haptics.locationSharingOff()
      await stopSharing()
    } else {
      if (permissionStatus === 'background_granted') {
        haptics.locationSharingOn()
        await startSharing()
      } else {
        setGateVisible(true)
      }
    }
  }

  return (
    <>
      <Pressable
        onPress={handleToggleSharing}
        style={[
          styles.row,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.md,
            padding: spacing.md,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
        accessibilityLabel="Toggle Location Sharing"
        accessibilityRole="switch"
        accessibilityState={{ checked: isSharing }}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.labelRow}>
            <Text style={[text.label.md, { color: colors.textPrimary }]}>Share Location</Text>
            {isSharing && (
              <View style={[styles.bgActiveBadge, { backgroundColor: colors.accentPrimary + '20', borderRadius: radius.sm }]}>
                <Text style={[text.label.sm, { color: colors.accentPrimary, fontSize: 10 }]}>Background Active</Text>
              </View>
            )}
          </View>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
            Broadcast location to group in the background for 4 hours
          </Text>
        </View>
        <View style={[styles.switchTrack, { backgroundColor: isSharing ? colors.positive + '30' : colors.border, borderRadius: radius.full }]}>
          <View style={[styles.switchThumb, { backgroundColor: isSharing ? colors.positive : colors.textSecondary, alignSelf: isSharing ? 'flex-end' : 'flex-start', borderRadius: radius.full }]} />
        </View>
      </Pressable>

      <LocationPermissionGate
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bgActiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  switchTrack: {
    width: 48,
    height: 26,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
  },
})
