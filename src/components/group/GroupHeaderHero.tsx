// src/components/group/GroupHeaderHero.tsx
// Kora & Ink group hero — Blueprint §4.3.1. Transparent header over fabric:
// back tile + overflow icon only (invite chip moves to the Members tab). Hero
// block: 48pt emoji tile, group name displayMd (Cabinet Grotesk), one bodySm
// line "Goa · 12–16 Nov · 5 friends". No text-glyph controls, no emoji chrome.

import { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { CaretLeft, DotsThree } from 'phosphor-react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@theme'
import { IconTile } from '@components'
import type { GroupInput } from '@lib/schemas'

interface Props {
  group: GroupInput
}

// "12–16 Nov" style range from YYYY-MM-DD strings; falls back gracefully.
function formatRange(start?: string, end?: string): string | null {
  if (!start) return null
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  try {
    const s = new Date(start)
    if (!end) return s.toLocaleDateString('en-IN', opts)
    const e = new Date(end)
    const sameMonth = s.getMonth() === e.getMonth()
    const sDay = s.getDate()
    const eStr = e.toLocaleDateString('en-IN', opts)
    return sameMonth ? `${sDay}–${eStr}` : `${s.toLocaleDateString('en-IN', opts)} – ${eStr}`
  } catch {
    return start
  }
}

export const GroupHeaderHero = memo(function GroupHeaderHero({ group }: Props) {
  const { colors, text, spacing, layout } = useTheme()
  const navigation = useNavigation()

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ;(navigation.navigate as (screen: string, params: object) => void)('GroupSettings', { groupId: group.id })
  }, [navigation, group.id])

  const memberCount = group.memberIds.length
  const metaParts = [
    group.destination,
    formatRange(group.startDate, group.endDate),
    `${memberCount} ${memberCount === 1 ? 'friend' : 'friends'}`,
  ].filter(Boolean)

  return (
    <View style={{ paddingHorizontal: layout.screenPaddingH, paddingTop: spacing.lg }}>
      {/* Nav row — back tile + overflow (max: back, name block, overflow) */}
      <View style={[styles.navRow, { marginBottom: spacing.lg }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.tile, { backgroundColor: colors.bgTertiary }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <CaretLeft size={20} color={colors.textPrimary} weight="regular" />
        </Pressable>

        <Pressable
          onPress={handleOpenSettings}
          hitSlop={12}
          style={[styles.tile, { backgroundColor: colors.bgTertiary }]}
          accessibilityRole="button"
          accessibilityLabel="Group options"
        >
          <DotsThree size={22} color={colors.textPrimary} weight="bold" />
        </Pressable>
      </View>

      {/* Hero content */}
      <IconTile size={48} style={{ marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 24 }}>{group.coverEmoji ?? '🧵'}</Text>
      </IconTile>
      <Text style={[text.display.md, { color: colors.textPrimary }]} numberOfLines={2}>
        {group.name}
      </Text>
      {metaParts.length > 0 && (
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4 }]}>
          {metaParts.join(' · ')}
        </Text>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
