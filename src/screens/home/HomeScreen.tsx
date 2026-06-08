// src/screens/home/HomeScreen.tsx
import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen } from '@components'
import { useGroups } from '@hooks/useGroups'
import { useAuth } from '@hooks/useAuth'
import { useGroupStore } from '@stores/group.store'
import type { HomeStackParamList } from '@navigation/types'
import type { GroupInput } from '@lib/schemas'


type Nav = NativeStackNavigationProp<HomeStackParamList>

export function HomeScreen() {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const navigation = useNavigation<Nav>()
  const { user }   = useAuth()
  const { groups, isLoading } = useGroups()
  const [fabOpen, setFabOpen] = useState(false)

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  // ── FAB menu animation ────────────────────────────────────────
  const fabAnim = React.useRef(new Animated.Value(0)).current

  const toggleFAB = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const toValue = fabOpen ? 0 : 1
    Animated.spring(fabAnim, {
      toValue,
      tension: 80,
      friction: 7,
      useNativeDriver: true,
    }).start()
    setFabOpen(!fabOpen)
  }, [fabOpen, fabAnim])

  const handleCreate = useCallback(() => {
    toggleFAB()
    setTimeout(() => navigation.navigate('CreateGroup'), 200)
  }, [navigation, toggleFAB])

  const handleJoin = useCallback(() => {
    toggleFAB()
    setTimeout(() => navigation.navigate('JoinGroup'), 200)
  }, [navigation, toggleFAB])

  const handleGroupPress = useCallback((group: GroupInput) => {
    useGroupStore.getState().setActiveGroup(group)
    navigation.navigate('GroupHome', {
      groupId:   group.id,
      groupName: group.name,
    })
  }, [navigation])

  // ── FAB option positions ──────────────────────────────────────
  const createTranslate = fabAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -120],
  })
  const joinTranslate = fabAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -64],
  })
  const fabRotate = fabAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '45deg'],
  })

  // ── Render group card ─────────────────────────────────────────
  const renderGroup = useCallback(({ item }: { item: GroupInput }) => {
    const memberCount = item.memberIds.length

    return (
      <Pressable
        onPress={() => handleGroupPress(item)}
        style={({ pressed }) => [
          styles.groupCard,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.lg,
            borderColor:     colors.border,
            marginBottom:    spacing.md,
            opacity:         pressed ? 0.85 : 1,
            ...shadows.card,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${memberCount} members`}
      >
        {/* Emoji + info */}
        <View style={[styles.cardRow, { padding: spacing.lg }]}>
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
            <Text style={{ fontSize: 26 }}>{item.coverEmoji ?? '✈️'}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[text.heading.sm, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {item.destination && (
              <Text
                style={[
                  text.label.md,
                  { color: colors.textSecondary, marginTop: 2 },
                ]}
                numberOfLines={1}
              >
                📍 {item.destination}
              </Text>
            )}

            <View style={[styles.cardMeta, { marginTop: spacing.xs }]}>
              <Text style={[text.label.sm, { color: colors.textMuted }]}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
              {item.startDate && (
                <>
                  <Text style={[text.label.sm, { color: colors.textMuted }]}>
                    {' · '}
                  </Text>
                  <Text style={[text.label.sm, { color: colors.textMuted }]}>
                    {item.startDate}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Status badge */}
          {item.status === 'completed' && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.bgTertiary,
                  borderRadius:    radius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   3,
                },
              ]}
            >
              <Text style={[text.label.sm, { color: colors.textMuted }]}>
                Done
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    )
  }, [colors, text, spacing, radius, shadows, handleGroupPress])

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { marginBottom: spacing.xl }]}>
        <View>
          <Text style={[text.heading.lg, { color: colors.textPrimary }]}>
            Hey {firstName} 👋
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
            {groups.length === 0
              ? 'Create your first trip group'
              : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
          </Text>
        </View>
      </View>

      {/* Groups list */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.empty, { paddingTop: spacing['4xl'] }]}>
              <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>🗺️</Text>
              <Text
                style={[
                  text.heading.sm,
                  { color: colors.textPrimary, marginBottom: spacing.sm },
                ]}
              >
                No trips yet
              </Text>
              <Text
                style={[
                  text.body.md,
                  {
                    color:      colors.textSecondary,
                    textAlign: 'center',
                    maxWidth:   240,
                  },
                ]}
              >
                Tap + to create your first group or join one with an invite code.
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB overlay — close on backdrop tap */}
      {fabOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={toggleFAB}
          accessible={false}
        />
      )}

      {/* FAB options */}
      <Animated.View
        style={[
          styles.fabOption,
          {
            bottom:    80,
            right:     spacing.lg,
            transform: [{ translateY: createTranslate }],
            opacity:   fabAnim,
          },
        ]}
        pointerEvents={fabOpen ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleCreate}
          style={[
            styles.fabOptionBtn,
            {
              backgroundColor: colors.accentPrimary,
              borderRadius:    radius.full,
              ...shadows.accentGlow,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create new group"
        >
          <Text style={[text.label.lg, { color: colors.bgPrimary }]}>
            ✚ Create group
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.fabOption,
          {
            bottom:    80,
            right:     spacing.lg,
            transform: [{ translateY: joinTranslate }],
            opacity:   fabAnim,
          },
        ]}
        pointerEvents={fabOpen ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleJoin}
          style={[
            styles.fabOptionBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius:    radius.full,
              borderWidth:     1,
              borderColor:     colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Join group with invite code"
        >
          <Text style={[text.label.lg, { color: colors.textPrimary }]}>
            🔗 Join with code
          </Text>
        </Pressable>
      </Animated.View>

      {/* FAB main button */}
      <Animated.View
        style={[
          styles.fab,
          {
            bottom:          80,
            right:           spacing.lg,
            backgroundColor: colors.accentPrimary,
            borderRadius:    radius.full,
            transform:       [{ rotate: fabRotate }],
            ...shadows.accentGlow,
          },
        ]}
      >
        <Pressable
          onPress={toggleFAB}
          style={styles.fabInner}
          accessibilityRole="button"
          accessibilityLabel={fabOpen ? 'Close menu' : 'Open create or join group'}
        >
          <Text style={{ fontSize: 28, color: colors.bgPrimary, lineHeight: 32 }}>
            +
          </Text>
        </Pressable>
      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
  },
  empty: {
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    width:    56,
    height:   56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInner: {
    width:    56,
    height:   56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOption: {
    position: 'absolute',
    right:    0,
    alignItems: 'flex-end',
  },
  fabOptionBtn: {
    paddingHorizontal: 16,
    paddingVertical:   12,
    minHeight:         44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
