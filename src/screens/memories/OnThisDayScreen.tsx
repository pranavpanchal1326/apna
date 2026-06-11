// src/screens/memories/OnThisDayScreen.tsx
// Nostalgic anniversary view showing photos taken on this calendar date in prior years.

import { useMemo } from 'react'
import {
  View,
  Text,
  SectionList,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { useMemoryStore } from '../../stores/memory.store'
import { useGroupStore } from '../../stores/group.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { Header, Avatar } from '@components'
import type { MemoriesStackParamList } from '../../navigation/types'
import type { MemoryInput } from '../../lib/schemas/memory.schema'

type Nav = NativeStackNavigationProp<MemoriesStackParamList>
type Route = RouteProp<MemoriesStackParamList, 'OnThisDay'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface YearSection {
  title: string
  data: MemoryInput[]
}

export function OnThisDayScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const { groupId } = route.params
  const activeGroup = useGroupStore((s) => s.activeGroup)

  const { memories } = useMemoryStore()
  const memberIds = activeGroup?.memberIds ?? []
  const { members } = useGroupMembers(memberIds)

  // Filter & group memories from the same month/day in prior years
  const priorYearMemories = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0')
    const currentDay = String(today.getDate()).padStart(2, '0')

    const filtered = memories.filter((m) => {
      const parts = m.date.split('-')
      if (parts.length !== 3) return false
      const yr = Number(parts[0])
      const mo = parts[1]
      const dy = parts[2]
      return yr < currentYear && mo === currentMonth && dy === currentDay
    })

    // Group by Year descending
    const groups: Record<string, MemoryInput[]> = {}
    filtered.forEach((m) => {
      const year = m.date.split('-')[0]
      if (!groups[year]) {
        groups[year] = []
      }
      groups[year].push(m)
    })

    const sections: YearSection[] = []
    Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0])) // Descending order of years
      .forEach(([year, items]) => {
        sections.push({ title: year, data: items })
      })

    return sections
  }, [memories])

  const renderItem = ({ item }: { item: MemoryInput }) => {
    const photographer = members.get(item.takenBy || '')
    const reactions = Object.keys(item.reactions || {})
    const yearsAgo = new Date().getFullYear() - Number(item.date.split('-')[0])

    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync()
          navigation.navigate('MemoryDetail', { memoryId: item.id, groupId })
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
            borderRadius: radius.xl,
            padding: spacing.md,
            marginBottom: spacing.md,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        {/* Photographer info header */}
        <View style={styles.cardHeader}>
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
              {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago today
            </Text>
          </View>
        </View>

        {/* Memory Photo */}
        <Image source={{ uri: item.photoUrl }} style={[styles.photo, { borderRadius: radius.lg, marginTop: spacing.sm }]} />

        {/* Location / Caption */}
        {item.location?.name && (
          <Text style={[text.body.sm, { color: colors.accentPrimary, marginTop: spacing.sm }]}>
            📍 {item.location.name}
          </Text>
        )}

        {item.caption ? (
          <Text style={[text.body.md, { color: colors.textPrimary, marginTop: spacing.sm }]} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}

        {/* Reaction badges summary */}
        {reactions.length > 0 && (
          <View style={[styles.reactionsRow, { marginTop: spacing.sm }]}>
            <Text style={[text.body.sm, { color: colors.textSecondary }]}>
              🔥 {reactions.length} reaction{reactions.length === 1 ? '' : 's'}
            </Text>
          </View>
        )}
      </Pressable>
    )
  }

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => {
    const yearsAgo = new Date().getFullYear() - Number(title)
    return (
      <View style={[styles.sectionHeader, { backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.lg }]}>
        <Text style={[text.heading.sm, { color: colors.textPrimary, fontWeight: '700' }]}>
          {title} — {yearsAgo} {yearsAgo === 1 ? 'Year' : 'Years'} Ago
        </Text>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, textAlign: 'center' }}>⏳</Text>
      <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
        Nothing Today
      </Text>
      <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.xl }]}>
        Photos posted on this date in prior years will appear here as a nostalgic highlight.
      </Text>
    </View>
  )

  const monthDayTitle = new Date().toLocaleDateString('default', { month: 'long', day: 'numeric' })

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <Header title={`On This Day (${monthDayTitle})`} showBack onBack={() => navigation.goBack()} />

      <SectionList
        sections={priorYearMemories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 40, paddingTop: spacing.sm }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  photo: {
    width: '100%',
    height: SCREEN_WIDTH - 64,
    resizeMode: 'cover',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingVertical: 14,
  },
})
