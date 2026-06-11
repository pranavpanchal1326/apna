// src/screens/profile/PrivacySettingsScreen.tsx
// Full Location Privacy Settings Dashboard with granular visibility controls, session toggles, and data audit trail.

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { useLocationStore } from '../../stores/location.store'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { Header, Divider, Button, Avatar } from '@components'
import type { HomeStackParamList } from '../../navigation/types'
import type { GroupLocationVisibility } from '../../lib/types/location.types'

type Nav = NativeStackNavigationProp<HomeStackParamList>
type Route = RouteProp<HomeStackParamList, 'PrivacySettings'>

export function PrivacySettingsScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const defaultGroupId = route.params?.groupId ?? null
  const myUid = useAuthStore((s) => s.user?.uid ?? '')

  // Group state
  const groups = useGroupStore((s) => s.groups)

  // Location Store
  const {
    isSharing,
    isGhostMode,
    sessionExpiryTime,
    privacyPreferences,
    startSession,
    stopSession,
    toggleGhostMode,
    loadPrivacyPreferences,
    updateGroupVisibility,
  } = useLocationStore()

  // Track which group section is expanded for member lists
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(defaultGroupId)

  // Trigger loading preferences for expanded group
  useEffect(() => {
    if (expandedGroupId) {
      loadPrivacyPreferences(expandedGroupId)
    }
  }, [expandedGroupId, loadPrivacyPreferences])

  // Session Time Formatter
  const getSessionStatusText = () => {
    if (!isSharing || !sessionExpiryTime) return 'Not sharing location'
    const diff = sessionExpiryTime - Date.now()
    if (diff <= 0) return 'Session expired'

    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60

    if (hrs > 0) {
      return `Active · Expires in ${hrs}h ${remMins}m`
    }
    return `Active · Expires in ${remMins}m`
  }

  const handleToggleSharing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (isSharing) {
      await stopSession()
      Alert.alert('Sharing Stopped', 'Your location has been disabled and cleared from the map.')
    } else {
      const activeGroup = useGroupStore.getState().activeGroup
      const targetGroupId = defaultGroupId || activeGroup?.id || groups[0]?.id
      if (!targetGroupId) {
        Alert.alert('Error', 'Please select or join a group first to share location.')
        return
      }
      await startSession(targetGroupId)
      Alert.alert('Sharing Started', 'Your location is now being shared with your group for 4 hours.')
    }
  }

  const handleDeleteLocationData = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Purge Location Data?',
      'This will immediately turn off location sharing, clear all ephemeral keys from the device, and write a deletion marker to the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge Now',
          style: 'destructive',
          onPress: async () => {
            await stopSession()
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            Alert.alert('Purged', 'Location session destroyed successfully.')
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <Header title="Location Privacy" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        
        {/* ── SECTION 1: Location Sharing ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[text.label.sm, { color: colors.accentPrimary, marginHorizontal: spacing.lg, marginVertical: spacing.md }]}>
            LOCATION SESSION
          </Text>

          <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: spacing.lg }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[text.label.md, { color: colors.textPrimary }]}>Share Location</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
                  {getSessionStatusText()}
                </Text>
              </View>
              <Switch
                value={isSharing}
                onValueChange={handleToggleSharing}
                trackColor={{ true: colors.positive + '40', false: colors.border }}
                thumbColor={isSharing ? colors.positive : colors.textSecondary}
              />
            </View>

            <Divider />

            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={[text.label.md, { color: colors.textPrimary }]}>Ghost Mode</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
                  You can see other members on the map, but you will appear completely offline to them.
                </Text>
              </View>
              <Switch
                value={isGhostMode}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  toggleGhostMode()
                }}
                trackColor={{ true: colors.accentPrimary + '40', false: colors.border }}
                thumbColor={isGhostMode ? colors.accentPrimary : colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* ── SECTION 2: Session Settings ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[text.label.sm, { color: colors.accentPrimary, marginHorizontal: spacing.lg, marginVertical: spacing.md }]}>
            SESSION DETAILS
          </Text>

          <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: spacing.lg, padding: spacing.md }]}>
            <View style={styles.infoRow}>
              <Text style={[text.label.md, { color: colors.textPrimary }]}>Auto-Expiry Duration</Text>
              <Text style={[text.body.md, { color: colors.textSecondary }]}>4 Hours (Fixed)</Text>
            </View>
            <Text style={[text.body.sm, { color: colors.textMuted, marginTop: spacing.sm }]}>
              All location sharing sessions automatically expire and terminate after 4 hours to preserve your privacy and device battery.
            </Text>
          </View>
        </View>

        {/* ── SECTION 3: Per-Group Exclusions ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[text.label.sm, { color: colors.accentPrimary, marginHorizontal: spacing.lg, marginVertical: spacing.md }]}>
            WHO CAN SEE ME (PER GROUP)
          </Text>

          <View style={{ gap: spacing.sm }}>
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id
              const prefs = privacyPreferences[group.id]

              return (
                <View
                  key={group.id}
                  style={[
                    styles.groupContainer,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      marginHorizontal: spacing.lg,
                    },
                  ]}
                >
                  {/* Group Header Trigger */}
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync()
                      setExpandedGroupId(isExpanded ? null : group.id)
                    }}
                    style={[styles.groupHeaderRow, { padding: spacing.md }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[text.label.md, { color: colors.textPrimary }]}>{group.name}</Text>
                      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
                        {prefs?.shareWithAll === false
                          ? `${prefs.excludedMembers.length} member(s) excluded`
                          : 'Shared with everyone'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                      {isExpanded ? '▴' : '▾'}
                    </Text>
                  </Pressable>

                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                      <GroupMembersVisibilityList
                        memberIds={group.memberIds}
                        myUid={myUid}
                        prefs={prefs}
                        onUpdateVisibility={(newPrefs) => updateGroupVisibility(group.id, newPrefs)}
                      />
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* ── SECTION 4: Data & Transparency ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[text.label.sm, { color: colors.accentPrimary, marginHorizontal: spacing.lg, marginVertical: spacing.md }]}>
            DATA & AUDIT TRAIL
          </Text>

          <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: spacing.lg, padding: spacing.md, gap: spacing.sm }]}>
            <Text style={[text.body.md, { color: colors.textSecondary, lineHeight: 20 }]}>
              • **No permanent storage:** Your location coordinates are written exclusively to Firebase Realtime Database and are never logged or stored in main archives.
            </Text>
            <Text style={[text.body.md, { color: colors.textSecondary, lineHeight: 20 }]}>
              • **Auto-wipe:** A daily server cron removes any historical coordinates older than 4 hours automatically.
            </Text>
            <Text style={[text.body.md, { color: colors.textSecondary, lineHeight: 20 }]}>
              • **Instant stop:** You can manually purge your active session and delete stored location nodes right now.
            </Text>

            <Button
              label="Stop Sharing & Purge Data"
              variant="danger"
              onPress={handleDeleteLocationData}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

// ── SUBCOMPONENT: Members Exclusion Toggles ───────────────────────────

interface GroupMembersVisibilityListProps {
  groupId: string
  memberIds: string[]
  myUid: string
  prefs: GroupLocationVisibility | undefined
  onUpdateVisibility: (newPrefs: GroupLocationVisibility) => Promise<void>
}

function GroupMembersVisibilityList({
  memberIds,
  myUid,
  prefs,
  onUpdateVisibility,
}: Omit<GroupMembersVisibilityListProps, 'groupId'>) {
  const { colors, spacing, text } = useTheme()

  // Load member profile objects
  const { members, isLoading } = useGroupMembers(memberIds)

  const excludedMembers = prefs?.excludedMembers ?? []

  const handleToggleMember = async (userId: string, currentVal: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    let nextExcluded = [...excludedMembers]

    if (currentVal) {
      // Toggle OFF -> Exclude
      if (!nextExcluded.includes(userId)) {
        nextExcluded.push(userId)
      }
    } else {
      // Toggle ON -> Include (remove from exclusion)
      nextExcluded = nextExcluded.filter((id) => id !== userId)
    }

    const nextShareWithAll = nextExcluded.length === 0

    await onUpdateVisibility({
      shareWithAll: nextShareWithAll,
      excludedMembers: nextExcluded,
      updatedAt: null,
    })
  }

  const handleHideFromAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const allExclusions = memberIds.filter((id) => id !== myUid)
    await onUpdateVisibility({
      shareWithAll: false,
      excludedMembers: allExclusions,
      updatedAt: null,
    })
  }

  const handleShowToAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await onUpdateVisibility({
      shareWithAll: true,
      excludedMembers: [],
      updatedAt: null,
    })
  }

  if (isLoading) {
    return (
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accentPrimary} />
      </View>
    )
  }

  const filteredMembersList = memberIds.filter((id) => id !== myUid)

  return (
    <View style={{ padding: spacing.md, gap: spacing.sm }}>
      {/* Hide / Show all shortcuts */}
      <View style={styles.shortcutsRow}>
        <Button
          label="Hide from all"
          variant="secondary"
          size="sm"
          onPress={handleHideFromAll}
          style={{ flex: 1, height: 32 }}
          textStyle={{ fontSize: 13 }}
        />
        <Button
          label="Show to all"
          variant="secondary"
          size="sm"
          onPress={handleShowToAll}
          style={{ flex: 1, height: 32 }}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      {filteredMembersList.map((uid) => {
        const member = members.get(uid)
        if (!member) return null

        const isExcluded = excludedMembers.includes(uid)
        const isVisible = !isExcluded

        return (
          <View key={uid} style={styles.memberRow}>
            <View style={styles.memberLeft}>
              <Avatar
                name={member.name}
                imageUrl={member.photoUrl}
                color={member.avatarColor}
                size="sm"
              />
              <Text style={[text.body.md, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                {member.name}
              </Text>
            </View>
            <Switch
              value={isVisible}
              onValueChange={() => handleToggleMember(uid, isVisible)}
              trackColor={{ true: colors.positive + '40', false: colors.border }}
              thumbColor={isVisible ? colors.positive : colors.textSecondary}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  section: {
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
})
