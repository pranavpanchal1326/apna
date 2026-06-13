// src/screens/memories/MemoryDetailScreen.tsx
// High-res memory detail screen with double-tap like gesture,
// quick emoji reaction bar, and reactor detail list bottom-sheet.

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { haptics } from '@lib/haptics'
import { useTheme } from '../../theme'
import { useMemoryStore } from '../../stores/memory.store'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { Header, BottomSheet, Avatar } from '@components'
import { REACTION_EMOJIS, type ReactionEmoji } from '../../lib/types/memory.types'
import type { MemoriesStackParamList } from '../../navigation/types'

type Nav = NativeStackNavigationProp<MemoriesStackParamList>
type Route = RouteProp<MemoriesStackParamList, 'MemoryDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function MemoryDetailScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const { memoryId, groupId } = route.params
  const myUid = useAuthStore((s) => s.user?.uid ?? '')
  const activeGroup = useGroupStore((s) => s.activeGroup)

  // Zustand Store
  const { memories, castReaction, removeReaction } = useMemoryStore()

  // Find current memory from store
  const memory = useMemo(() => memories.find((m) => m.id === memoryId), [memories, memoryId])

  // Resolve group members for photographer and reactors
  const memberIds = activeGroup?.memberIds ?? []
  const { members } = useGroupMembers(memberIds)

  // BottomSheet State
  const [showReactorsSheet, setShowReactorsSheet] = useState(false)

  // ── Heart Animation Overlay Shared Values ────────────────────────
  const heartScale = useSharedValue(0)
  const heartOpacity = useSharedValue(0)

  // Animated styles for double-tap overlay
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }))

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      // Run Haptic feedback on main thread
      haptics.reactionAdded()
      
      // Trigger heart animation
      heartScale.value = 0
      heartOpacity.value = 1
      heartScale.value = withSequence(
        withSpring(1.5, { damping: 6, stiffness: 100 }),
        withTiming(0, { duration: 600 })
      )
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 600 })
      )

      // Cast heart reaction in store
      castReaction(groupId, memoryId, myUid, '❤️')
    })

  if (!memory) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
        <Header title="Memory Detail" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={[text.body.lg, { color: colors.textSecondary }]}>Memory not found.</Text>
        </View>
      </View>
    )
  }

  const photographer = members.get(memory.takenBy || '')
  const reactions = memory.reactions || {}
  const activeReaction = reactions[myUid]

  // Count reactions grouping
  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(reactions).forEach((emoji) => {
      counts[emoji] = (counts[emoji] || 0) + 1
    })
    return counts
  }, [reactions])

  // Handle toggling reaction
  const handleToggleEmoji = (emoji: ReactionEmoji) => {
    if (activeReaction === emoji) {
      removeReaction(groupId, memoryId, myUid)
    } else {
      haptics.reactionAdded()
      castReaction(groupId, memoryId, myUid, emoji)
    }
  }

  // Format YYYY-MM-DD to human readable
  const formattedDate = () => {
    const parts = memory.date.split('-')
    if (parts.length !== 3) return memory.date
    const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return dObj.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <Header title="Memory Detail" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        {/* Immersive Photo Viewer */}
        <GestureDetector gesture={doubleTapGesture}>
          <View style={[styles.photoContainer, { backgroundColor: colors.bgSecondary }]}>
            <Image source={{ uri: memory.photoUrl }} style={styles.photo} resizeMode="contain" />
            
            {/* Heart Animation Overlay */}
            <Animated.View style={[styles.heartOverlay, heartStyle]}>
              <Text style={{ fontSize: 90 }}>❤️</Text>
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Content details */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          {/* Taken By metadata */}
          <View style={styles.takenRow}>
            {photographer ? (
              <Avatar
                name={photographer.name}
                imageUrl={photographer.photoUrl}
                color={photographer.avatarColor}
                size="sm"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]} />
            )}
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[text.label.md, { color: colors.textPrimary }]}>
                {photographer?.name || 'Group Member'}
              </Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                {formattedDate()}
              </Text>
            </View>
          </View>

          {/* Location if present */}
          {memory.location?.name && (
            <Text style={[text.body.sm, { color: colors.accentPrimary, marginTop: spacing.sm }]}>
              📍 {memory.location.name}
            </Text>
          )}

          {/* Caption */}
          {memory.caption ? (
            <Text style={[text.body.lg, { color: colors.textPrimary, marginTop: spacing.md, lineHeight: 22 }]}>
              {memory.caption}
            </Text>
          ) : null}

          {/* Interactive Emoji Reaction Bar */}
          <View style={[styles.reactionsBar, { borderColor: colors.border, marginTop: spacing.xl }]}>
            {REACTION_EMOJIS.map((emoji) => {
              const isActive = activeReaction === emoji
              return (
                <Pressable
                  key={emoji}
                  onPress={() => handleToggleEmoji(emoji)}
                  style={[
                    styles.emojiBtn,
                    {
                      backgroundColor: isActive ? colors.accentPrimary + '20' : 'transparent',
                      borderColor: isActive ? colors.accentPrimary : 'transparent',
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </Pressable>
              )
            })}
          </View>

          {/* Summary / Count Row */}
          {Object.keys(reactionCounts).length > 0 && (
            <Pressable
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                setShowReactorsSheet(true)
              }}
              onPress={() => {
                Haptics.selectionAsync()
                setShowReactorsSheet(true)
              }}
              style={[
                styles.countsRow,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.sm,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={styles.countsList}>
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <View key={emoji} style={styles.countBadge}>
                    <Text style={{ fontSize: 16 }}>{emoji}</Text>
                    <Text style={[text.label.sm, { color: colors.textSecondary, marginLeft: 4 }]}>{count}</Text>
                  </View>
                ))}
              </View>
              <Text style={[text.body.sm, { color: colors.textMuted }]}>View who reacted ›</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Reactors Details BottomSheet */}
      <BottomSheet
        visible={showReactorsSheet}
        onClose={() => setShowReactorsSheet(false)}
        title="Reactions"
      >
        <ScrollView style={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
          {Object.entries(reactions).map(([uid, emoji]) => {
            const reactor = members.get(uid)
            if (!reactor) return null

            return (
              <View key={uid} style={[styles.reactorRow, { borderBottomColor: colors.border, paddingVertical: spacing.md }]}>
                <View style={styles.reactorLeft}>
                  <Avatar
                    name={reactor.name}
                    imageUrl={reactor.photoUrl}
                    color={reactor.avatarColor}
                    size="sm"
                  />
                  <Text style={[text.body.lg, { color: colors.textPrimary, marginLeft: spacing.md }]}>
                    {reactor.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </View>
            )
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  heartOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 30,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  countsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  reactorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
