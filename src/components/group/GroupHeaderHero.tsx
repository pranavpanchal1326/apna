// src/components/group/GroupHeaderHero.tsx
// Collapsible group header — large when at top, collapses on scroll.
// Shows: back button, emoji, group name, destination, dates, invite code.

import { memo, useCallback } from 'react'
import { View, Text, Pressable, Share, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@theme'
import type { GroupInput } from '@lib/schemas'
import { track } from '@lib/analytics'

interface Props {
  group:          GroupInput
}

export const GroupHeaderHero = memo(function GroupHeaderHero({ group }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation()

  const handleShare = useCallback(async () => {
    if (!group.inviteCode) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await Share.share({
        message: `Join "${group.name}" on apna!\n\nCode: ${group.inviteCode}\n\nhttps://apna.app`,
      })
      track('invite_shared', { source: 'group_header' })
    } catch {
      // User cancelled share sheet — no error
    }
  }, [group])

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('GroupSettings' as any, { groupId: group.id })
  }, [navigation, group.id])

  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
      {/* Nav row */}
      <View style={[styles.navRow, { marginBottom: spacing.lg }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius:    radius.full,
              width:           36,
              height:          36,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={{ color: colors.textPrimary, fontSize: 18 }}>←</Text>
        </Pressable>

        <View style={styles.rightActions}>
          {/* Invite code chip */}
          {group.inviteCode && (
            <Pressable
              onPress={handleShare}
              style={[
                styles.inviteChip,
                {
                  backgroundColor: colors.bgTertiary,
                  borderRadius:    radius.full,
                  borderColor:     colors.borderAccent,
                  borderWidth:     1,
                  paddingHorizontal: spacing.md,
                  paddingVertical:   spacing.xs,
                  minHeight:         36,
                  justifyContent:    'center',
                  marginRight:       spacing.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Share invite code ${group.inviteCode}`}
            >
              <Text style={[text.mono.sm, { color: colors.accentPrimary, letterSpacing: 3 }]}>
                {group.inviteCode}
              </Text>
              <Text style={[text.label.sm, { color: colors.textMuted, marginLeft: spacing.xs }]}>
                · share
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleOpenSettings}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.full,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Group settings"
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Hero content */}
      <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>
        {group.coverEmoji ?? '✈️'}
      </Text>
      <Text
        style={[text.heading.lg, { color: colors.textPrimary, marginBottom: 4 }]}
        numberOfLines={2}
      >
        {group.name}
      </Text>
      {group.destination && (
        <Text style={[text.body.sm, { color: colors.textSecondary }]}>
          📍 {group.destination}
        </Text>
      )}
      {group.startDate && (
        <Text style={[text.label.md, { color: colors.textMuted, marginTop: 2 }]}>
          {group.startDate}{group.endDate ? ` → ${group.endDate}` : ''}
        </Text>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { alignItems: 'center', justifyContent: 'center' },
  inviteChip:   { flexDirection: 'row', alignItems: 'center' },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
})
