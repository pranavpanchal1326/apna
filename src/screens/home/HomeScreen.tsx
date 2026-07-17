// src/screens/home/HomeScreen.tsx
// Kora & Ink Home — Blueprint §4.2.1.
// Signature moment: the net-position hero. Opening the app answers the only
// question that matters — "am I owed, or do I owe?" — in one glance.
//
// Law 2 focal point: the net-position hero. Law 3 madder slots: (1) FAB
// "New trip", (2) a negative hero amount, (3) unseen-dot on rows.
// Cards are gone — groups are Rows on fabric, separated by StitchLabels.

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@theme'
import {
  Screen,
  Row,
  IconTile,
  StitchLabel,
  Amount,
  Avatar,
  FAB,
  Sheet,
  EmptyState,
  SkeletonRow,
  ThreadAdd,
  StitchArrow,
} from '@components'
import { useGroups } from '@hooks/useGroups'
import { useAuth } from '@hooks/useAuth'
import { useGroupStore } from '@stores/group.store'
import { totalNetForUser, groupNetForUser, netTone } from '@lib/utils/netPosition'
import type { HomeStackParamList } from '@navigation/types'
import type { GroupInput } from '@lib/schemas'

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeList'>
type Route = RouteProp<HomeStackParamList, 'HomeList'>

export function HomeScreen() {
  const { colors, text, spacing } = useTheme()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user } = useAuth()
  const { groups, isLoading } = useGroups()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const skipped = route.params?.skipped ?? false
  const uid = user?.uid

  // Redirect to ChoosePath onboarding if user has 0 groups and didn't skip
  useEffect(() => {
    if (!isLoading && groups.length === 0 && !skipped) {
      navigation.replace('ChoosePath', {})
    }
  }, [isLoading, groups.length, skipped, navigation])

  // ── Net position across all groups (the hero) ─────────────────
  const net = useMemo(() => totalNetForUser(groups, uid), [groups, uid])
  const tone = netTone(net)

  // ── Active first, past under a second StitchLabel (§4.2.1) ────
  const { active, past } = useMemo(() => {
    const a: GroupInput[] = []
    const p: GroupInput[] = []
    for (const g of groups) {
      ;(g.status === 'completed' ? p : a).push(g)
    }
    return { active: a, past: p }
  }, [groups])

  const handleGroupPress = useCallback(
    (group: GroupInput) => {
      useGroupStore.getState().setActiveGroup(group)
      navigation.navigate('GroupHome', { groupId: group.id, groupName: group.name })
    },
    [navigation]
  )

  const openProfile = useCallback(() => {
    // Profile lives on a sibling tab; hop via the parent tab navigator.
    navigation.getParent()?.navigate('Profile' as never)
  }, [navigation])

  const handleCreate = useCallback(() => {
    setSheetOpen(false)
    setTimeout(() => navigation.navigate('CreateGroup'), 180)
  }, [navigation])

  const handleJoin = useCallback(() => {
    setSheetOpen(false)
    setTimeout(() => navigation.navigate('JoinGroup'), 180)
  }, [navigation])

  // ── Group row ─────────────────────────────────────────────────
  const renderGroup = useCallback(
    ({ item, muted }: { item: GroupInput; muted?: boolean }) => {
      const memberCount = item.memberIds.length
      const gNet = groupNetForUser(item.balances, uid)
      const subtitleParts = [
        `${memberCount} ${memberCount === 1 ? 'friend' : 'friends'}`,
        item.destination,
        item.startDate,
      ].filter(Boolean)

      return (
        <Row
          onPress={() => handleGroupPress(item)}
          muted={muted}
          title={item.name}
          subtitle={subtitleParts.join(' · ')}
          leading={
            <IconTile size={48} tint={muted ? colors.bgSecondary : undefined}>
              <Text style={{ fontSize: 24 }}>{item.coverEmoji ?? '🧵'}</Text>
            </IconTile>
          }
          trailing={
            Math.abs(gNet) >= 1 ? (
              <Amount value={gNet} size="md" signed />
            ) : (
              <Amount value={0} size="md" settled />
            )
          }
        />
      )
    },
    [colors, uid, handleGroupPress]
  )

  const heroLabel =
    tone === 'settled'
      ? 'All settled'
      : tone === 'owed'
      ? "You're owed"
      : 'You owe'

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y
      setCollapsed((c) => (c !== y > 24 ? y > 24 : c))
    },
    []
  )

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading && groups.length === 0) {
    return (
      <Screen contentContainerStyle={styles.pad}>
        <HomeHeader user={user} onAvatar={openProfile} />
        <View style={{ marginTop: spacing['2xl'] }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </View>
      </Screen>
    )
  }

  // ── Empty ─────────────────────────────────────────────────────
  if (!isLoading && groups.length === 0) {
    return (
      <Screen contentContainerStyle={styles.pad}>
        <HomeHeader user={user} onAvatar={openProfile} />
        <EmptyState
          title="No trips yet."
          description="Start one, or join with a friend's code."
          ctaLabel="Create a trip"
          onCta={() => navigation.navigate('CreateGroup')}
        />
      </Screen>
    )
  }

  return (
    <Screen contentContainerStyle={styles.pad}>
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderGroup({ item })}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <HomeHeader user={user} onAvatar={openProfile} />

            {/* Hero — net position across all trips (Law 2 focal point) */}
            <View style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
              {tone === 'settled' ? (
                <Text style={[text.display.sm, { color: colors.settled }]}>All settled</Text>
              ) : (
                <>
                  <Text style={[text.heading.md, { color: colors.textSecondary }]}>
                    {heroLabel}
                  </Text>
                  <Amount value={Math.abs(net)} size="lg" animate
                    color={tone === 'owed' ? colors.positive : colors.negative} />
                </>
              )}
            </View>

            <StitchLabel label="Your trips" />
          </View>
        }
        ListFooterComponent={
          past.length > 0 ? (
            <View>
              <StitchLabel label="Earlier" tone="dim" />
              {past.map((item) => (
                <React.Fragment key={item.id}>
                  {renderGroup({ item, muted: true })}
                </React.Fragment>
              ))}
            </View>
          ) : null
        }
      />

      {/* FAB — morphing pill "New trip" (Law 3 slot 1) */}
      <FAB
        label="New trip"
        collapsed={collapsed}
        onPress={() => setSheetOpen(true)}
        accessibilityLabel="New trip"
        style={styles.fab}
      />

      {/* Two-Row Sheet replaces the satellite-button pattern (§4.2.1) */}
      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New trip">
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
          <Row
            title="Create a trip"
            subtitle="Start fresh with friends"
            onPress={handleCreate}
            leading={<IconTile><ThreadAdd size={20} color={colors.textPrimary} /></IconTile>}
          />
          <Row
            title="Join with code"
            subtitle="Enter a friend's invite code"
            onPress={handleJoin}
            leading={<IconTile><StitchArrow size={20} color={colors.textPrimary} /></IconTile>}
          />
        </View>
      </Sheet>
    </Screen>
  )
}

// ── Header: wordmark + avatar (§4.2.1) ──────────────────────────
function HomeHeader({
  user,
  onAvatar,
}: {
  user: ReturnType<typeof useAuth>['user']
  onAvatar: () => void
}) {
  const { colors, text } = useTheme()
  return (
    <View style={styles.header}>
      {/* Wordmark: one stitched "a" + solid "pna" is the branded lockup (§7.3);
          here we use the plain Cabinet 800 wordmark for the app-chrome header. */}
      <Text style={[text.display.sm, { color: colors.textPrimary, fontSize: 20 }]}>
        apna
      </Text>
      {user && (
        <Pressable onPress={onAvatar} accessibilityRole="button" accessibilityLabel="Open profile" hitSlop={8}>
          <Avatar name={user.name ?? '?'} color={user.avatarColor} size="sm" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
})
