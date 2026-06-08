// src/screens/group/JoinGroupScreen.tsx
import { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Button, Input, Screen } from '@components'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackParamList } from '@navigation/types'
import { getDoc, Timestamp } from 'firebase/firestore'
import { inviteDoc, groupDoc } from '@lib/firebase/collections'
import type { GroupInput } from '@lib/schemas'

type Nav = NativeStackNavigationProp<HomeStackParamList>

export function JoinGroupScreen() {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const navigation = useNavigation<Nav>()
  const { user }   = useAuth()
  const { joinGroup, isJoining } = useGroupStore()

  const [code, setCode]                       = useState('')
  const [groupPreview, setGroupPreview]       = useState<GroupInput | null>(null)
  const [loadingPreview, setLoadingPreview]   = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  const handleTextChange = (val: string) => {
    setError(null)
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(formatted)

    // Clear preview if code changes
    if (groupPreview) {
      setGroupPreview(null)
    }

    // Auto-verify when 6 characters are typed
    if (formatted.length === 6) {
      verifyInviteCode(formatted)
    }
  }

  const verifyInviteCode = async (inviteCode: string) => {
    setError(null)
    setLoadingPreview(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const inviteSnap = await getDoc(inviteDoc(inviteCode))
      if (!inviteSnap.exists()) {
        throw new Error('Invalid invite code. Check and try again.')
      }

      const invite = inviteSnap.data() as any
      const now = Timestamp.now()

      if (invite.expiresAt.toMillis() < now.toMillis()) {
        throw new Error('This invite code has expired.')
      }

      if (invite.useCount >= invite.maxUses) {
        throw new Error('This invite code has reached its use limit.')
      }

      const groupSnap = await getDoc(groupDoc(invite.groupId))
      if (!groupSnap.exists()) {
        throw new Error('The group associated with this invite no longer exists.')
      }

      const group = groupSnap.data()
      if (user?.uid && group.memberIds.includes(user.uid)) {
        setError('You are already a member of this group.')
      }

      setGroupPreview(group)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify invite code.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleJoin = useCallback(async () => {
    if (!user?.uid || !groupPreview) return
    setError(null)

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await joinGroup(code, user.uid)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      navigation.replace('GroupHome', {
        groupId:   groupPreview.id,
        groupName: groupPreview.name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [user, groupPreview, code, joinGroup, navigation])

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={{ color: colors.accentPrimary, fontSize: 22 }}>←</Text>
          </Pressable>

          <Text style={[text.label.lg, { color: colors.textSecondary }]}>
            Join Group
          </Text>

          <View style={{ width: 32 }} />
        </View>

        <View style={[styles.content, { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] }]}>
          <Text style={[text.display.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Enter invite{'\n'}code
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, marginBottom: spacing['2xl'] }]}>
            Ask your friend for the 6-character code to join their trip.
          </Text>

          <Input
            label="Invite code"
            value={code}
            onChangeText={handleTextChange}
            placeholder="e.g. GOA26A"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            error={error ?? undefined}
            autoFocus
          />

          {loadingPreview && (
            <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accentPrimary} size="large" />
            </View>
          )}

          {groupPreview && (
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderRadius:    radius.lg,
                  borderColor:     colors.border,
                  padding:         spacing.lg,
                  marginTop:       spacing.xl,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[text.label.sm, { color: colors.accentPrimary, marginBottom: spacing.sm }]}>
                GROUP FOUND
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <View
                  style={[
                    styles.emojiContainer,
                    {
                      backgroundColor: colors.bgTertiary,
                      borderRadius:    radius.md,
                      width:  52,
                      height: 52,
                      marginRight: spacing.md,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 26 }}>{groupPreview.coverEmoji ?? '✈️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[text.heading.sm, { color: colors.textPrimary }]} numberOfLines={1}>
                    {groupPreview.name}
                  </Text>
                  {groupPreview.destination ? (
                    <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                      📍 {groupPreview.destination}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                <Text style={[text.label.md, { color: colors.textSecondary }]}>Members</Text>
                <Text style={[text.body.md, { color: colors.textPrimary }]}>
                  {groupPreview.memberIds.length} / 20
                </Text>
              </View>

              {groupPreview.startDate && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <Text style={[text.label.md, { color: colors.textSecondary }]}>Dates</Text>
                  <Text style={[text.body.md, { color: colors.textPrimary }]}>
                    {groupPreview.startDate} to {groupPreview.endDate || '—'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Footer actions */}
        <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, marginTop: 'auto' }]}>
          {groupPreview && !error && (
            <Button
              label="Join Group"
              onPress={handleJoin}
              loading={isJoining}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  content: {
    flex: 1,
  },
  previewCard: {
    borderWidth: 1,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    width: '100%',
  },
})
