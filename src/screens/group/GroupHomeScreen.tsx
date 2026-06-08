// src/screens/group/GroupHomeScreen.tsx
import { useCallback, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Button, Screen } from '@components'
import { useActiveGroup } from '@hooks/useGroups'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackParamList } from '@navigation/types'

type GroupHomeRouteProp = RouteProp<HomeStackParamList, 'GroupHome'>
type Nav = NativeStackNavigationProp<HomeStackParamList>

export function GroupHomeScreen() {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const route = useRoute<GroupHomeRouteProp>()
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const { leaveGroup, isLoading: isLeaving } = useGroupStore()

  const { groupId, groupName } = route.params
  const group = useActiveGroup(groupId)

  const [error, setError] = useState<string | null>(null)

  const handleLeave = useCallback(async () => {
    if (!user?.uid) return
    setError(null)

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group?.name || groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              await leaveGroup(groupId, user.uid)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              navigation.navigate('HomeList')
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to leave group.'
              setError(msg)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            }
          },
        },
      ]
    )
  }, [user, group, groupId, groupName, leaveGroup, navigation])

  if (!group) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading squad...
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { marginBottom: spacing.xl }]}>
        <Pressable
          onPress={() => navigation.navigate('HomeList')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: colors.accentPrimary, fontSize: 22 }}>←</Text>
        </Pressable>

        <Text style={[text.label.lg, { color: colors.textSecondary }]}>
          Squad Home
        </Text>

        <View style={{ width: 32 }} />
      </View>

      {/* Main Cover Emoji Card */}
      <View
        style={[
          styles.coverCard,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.lg,
            borderColor:     colors.border,
            padding:         spacing.xl,
            ...shadows.card,
            marginBottom:    spacing.xl,
          },
        ]}
      >
        <Text style={styles.coverEmoji}>{group.coverEmoji ?? '✈️'}</Text>
        <Text style={[text.heading.lg, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }]}>
          {group.name}
        </Text>
        {group.destination && (
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
            📍 {group.destination}
          </Text>
        )}
        {group.startDate && (
          <Text style={[text.label.md, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            📅 {group.startDate} {group.endDate ? `to ${group.endDate}` : ''}
          </Text>
        )}
      </View>

      {/* Invite Code Section */}
      <View
        style={[
          styles.inviteSection,
          {
            backgroundColor: colors.bgTertiary,
            borderRadius:    radius.md,
            padding:         spacing.lg,
            marginBottom:    spacing.xl,
          },
        ]}
      >
        <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          INVITE SQUAD
        </Text>
        <View style={styles.codeRow}>
          <Text style={[text.display.sm, { color: colors.textPrimary, letterSpacing: 4 }]}>
            {group.inviteCode}
          </Text>
          <Text style={[text.body.sm, { color: colors.accentPrimary }]}>
            Share Code
          </Text>
        </View>
        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Expires in 72 hours. Tap to share with your friends.
        </Text>
      </View>

      {/* Members overview */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          SQUAD MEMBERS ({group.memberIds.length})
        </Text>
        {group.memberIds.map((memberId) => (
          <View
            key={memberId}
            style={[
              styles.memberRow,
              {
                backgroundColor: colors.bgSecondary,
                borderRadius:    radius.md,
                borderColor:     colors.border,
                padding:         spacing.md,
                marginBottom:    spacing.sm,
              },
            ]}
          >
            <Text style={[text.body.md, { color: colors.textPrimary }]}>
              {memberId === user?.uid ? `${user?.name} (You)` : `User ${memberId.slice(0, 6)}`}
            </Text>
            {group.adminIds.includes(memberId) && (
              <View
                style={[
                  styles.adminBadge,
                  {
                    backgroundColor: colors.bgTertiary,
                    borderRadius:    radius.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical:   2,
                  },
                ]}
              >
                <Text style={[text.label.sm, { color: colors.accentPrimary }]}>
                  Admin
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Leave Group Button */}
      <View style={{ marginTop: 'auto' }}>
        {error && (
          <Text style={[text.body.sm, { color: colors.accentDanger, marginBottom: spacing.md, textAlign: 'center' }]}>
            {error}
          </Text>
        )}
        
        {group.createdBy !== user?.uid && (
          <Button
            label="Leave Group"
            variant="secondary"
            onPress={handleLeave}
            loading={isLeaving}
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  coverCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  coverEmoji: {
    fontSize: 64,
  },
  inviteSection: {
    width: '100%',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  adminBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
