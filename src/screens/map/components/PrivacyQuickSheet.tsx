// src/screens/map/components/PrivacyQuickSheet.tsx
// Quick-access BottomSheet for map screen to toggle sharing & Ghost Mode and navigate to full privacy settings.

import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../../theme'
import { useLocationStore } from '../../../stores/location.store'
import { BottomSheet, Button, LocationSharingToggle } from '@components'
import type { HomeStackParamList } from '../../../navigation/types'

type Nav = NativeStackNavigationProp<HomeStackParamList>

interface PrivacyQuickSheetProps {
  visible: boolean
  onClose: () => void
  groupId: string
}

export function PrivacyQuickSheet({ visible, onClose, groupId }: PrivacyQuickSheetProps) {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation<Nav>()

  const {
    isSharing,
    isGhostMode,
    sessionExpiryTime,
    toggleGhostMode,
  } = useLocationStore()

  // Format remaining time
  const getRemainingTimeText = () => {
    if (!isSharing || !sessionExpiryTime) return 'Not sharing'
    const diff = sessionExpiryTime - Date.now()
    if (diff <= 0) return 'Expired'

    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60

    if (hrs > 0) {
      return `Sharing · Expires in ${hrs}h ${remMins}m`
    }
    return `Sharing · Expires in ${remMins}m`
  }

  const handleToggleGhost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    toggleGhostMode()
  }

  const handleGoToFullSettings = () => {
    Haptics.selectionAsync()
    onClose()
    navigation.navigate('PrivacySettings', { groupId })
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Location Privacy">
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        {/* Session Status Summary */}
        <View style={[styles.statusBox, { backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border }]}>
          <Text style={[text.label.sm, { color: colors.textSecondary }]}>SESSION STATUS</Text>
          <Text style={[text.heading.sm, { color: isSharing ? colors.positive : colors.textPrimary, marginTop: 4 }]}>
            {getRemainingTimeText()}
          </Text>
        </View>

        {/* Share Location Row */}
        <LocationSharingToggle />

        {/* Ghost Mode Row */}
        <Pressable
          onPress={handleToggleGhost}
          style={[styles.row, { backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[text.label.md, { color: colors.textPrimary }]}>Ghost Mode</Text>
            <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
              See friends on map, but keep yourself hidden
            </Text>
          </View>
          <View style={[styles.switchTrack, { backgroundColor: isGhostMode ? colors.accentPrimary + '30' : colors.border, borderRadius: radius.full }]}>
            <View style={[styles.switchThumb, { backgroundColor: isGhostMode ? colors.accentPrimary : colors.textSecondary, alignSelf: isGhostMode ? 'flex-end' : 'flex-start', borderRadius: radius.full }]} />
          </View>
        </Pressable>

        {/* Full settings redirect */}
        <Button
          label="Manage Member Visibility"
          variant="ghost"
          onPress={handleGoToFullSettings}
          textStyle={{ color: colors.accentPrimary }}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  statusBox: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
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
