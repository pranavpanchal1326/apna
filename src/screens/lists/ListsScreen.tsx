// src/screens/lists/ListsScreen.tsx
// Group-scoped lists hub — shows all active lists, filter chips, empty state, and FAB.

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { useListStore } from '../../stores/list.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { CreateListSheet } from './components/CreateListSheet'
import { LIST_TYPE_META } from './components/ListTypeIcon'
import type { SharedList, SharedListCreate, SharedListType } from '../../lib/schemas/list.schema'
import type { ListsStackParamList } from '../../navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type Nav = NativeStackNavigationProp<ListsStackParamList>

const FILTER_OPTIONS: Array<SharedListType | 'all'> = ['all', 'packing', 'grocery', 'task']

export function ListsScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()

  const myUid       = useAuthStore((s) => s.user?.uid ?? '')
  const activeGroup = useGroupStore((s) => s.activeGroup)

  const { lists, isLoading, createList, subscribeToGroup } = useListStore()

  const [filter,      setFilter]      = useState<SharedListType | 'all'>('all')
  const [showCreate,  setShowCreate]  = useState(false)

  // Subscribe to group lists on mount / group change
  useEffect(() => {
    if (activeGroup?.id) subscribeToGroup(activeGroup.id)
  }, [activeGroup?.id, subscribeToGroup])

  const filtered = filter === 'all'
    ? lists
    : lists.filter((l) => l.type === filter)

  const handleCreate = useCallback(async (data: SharedListCreate) => {
    if (!activeGroup?.id) return
    const listId = await createList(activeGroup.id, data)
    setShowCreate(false)
    navigation.navigate('ListDetail', { listId, listTitle: data.title })
  }, [activeGroup?.id, createList, navigation])

  const handleListPress = useCallback((list: SharedList) => {
    Haptics.selectionAsync()
    navigation.navigate('ListDetail', { listId: list.id, listTitle: list.title })
  }, [navigation])

  const renderList = useCallback(({ item }: { item: SharedList }) => {
    const total    = item.itemCount
    const checked  = item.checkedCount
    const progress = total > 0 ? checked / total : 0
    const meta     = LIST_TYPE_META[item.type]

    return (
      <Pressable
        onPress={() => handleListPress(item)}
        style={[
          styles.listCard,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.lg,
            borderColor:     colors.border,
            borderWidth:     1,
            padding:         spacing.lg,
            marginHorizontal: spacing.md,
            marginBottom:    spacing.sm,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} list, ${checked} of ${total} done`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[text.body.lg, { color: colors.textPrimary, fontFamily: 'Outfit-SemiBold' }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.description ? (
                <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Progress count */}
          <View style={[
            styles.progressPill,
            {
              backgroundColor: checked === total && total > 0
                ? colors.accentPrimary + '22'
                : colors.bgTertiary,
              borderRadius: radius.full,
              borderColor:  checked === total && total > 0
                ? colors.accentPrimary + '55'
                : colors.border,
              borderWidth: 1,
            },
          ]}>
            <Text style={[text.label.sm, {
              color:      checked === total && total > 0 ? colors.accentPrimary : colors.textSecondary,
              fontFamily: 'Outfit-Medium',
            }]}>
              {checked}/{total}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        {total > 0 ? (
          <View style={[styles.progressBar, { backgroundColor: colors.bgTertiary, borderRadius: 2, marginTop: spacing.md }]}>
            <View style={[
              styles.progressFill,
              {
                width:           `${progress * 100}%` as `${number}%`,
                backgroundColor: checked === total ? colors.accentPrimary : colors.accentPrimary + '88',
                borderRadius:    2,
              },
            ]} />
          </View>
        ) : null}
      </Pressable>
    )
  }, [colors, text, spacing, radius, handleListPress])

  const renderEmpty = () => (
    <View style={[styles.empty, { paddingHorizontal: spacing.xl }]}>
      <Text style={{ fontSize: 48, textAlign: 'center' }}>📋</Text>
      <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
        No lists yet
      </Text>
      <Text style={[text.body.md, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
        {filter === 'all'
          ? 'Create a packing list, grocery run, or task list for the group.'
          : `No ${LIST_TYPE_META[filter as SharedListType].label.toLowerCase()} lists yet. Tap + to create one.`
        }
      </Text>
    </View>
  )

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
        <Text style={[text.heading.md, { color: colors.textPrimary }]}>Lists</Text>
        {activeGroup && (
          <Text style={[text.label.sm, { color: colors.textMuted }]}>{activeGroup.name}</Text>
        )}
      </View>

      {/* Filter chips */}
      <View style={[styles.filterRow, { paddingHorizontal: spacing.md, marginVertical: spacing.sm }]}>
        {FILTER_OPTIONS.map((f) => {
          const active = filter === f
          const label  = f === 'all' ? 'All' : LIST_TYPE_META[f].label
          const emoji  = f === 'all' ? '📋' : LIST_TYPE_META[f].emoji
          return (
            <Pressable
              key={f}
              onPress={() => { Haptics.selectionAsync(); setFilter(f) }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accentPrimary + '22' : colors.bgSecondary,
                  borderColor:     active ? colors.accentPrimary         : colors.border,
                  borderRadius:    radius.full,
                  borderWidth:     1,
                  paddingHorizontal: 12,
                  paddingVertical:  6,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[text.label.sm, {
                color:      active ? colors.accentPrimary : colors.textSecondary,
                fontFamily: 'Outfit-Medium',
              }]}>
                {emoji} {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => l.id}
          renderItem={renderList}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreate(true) }}
        style={[
          styles.fab,
          {
            backgroundColor:  colors.accentPrimary,
            borderRadius:     radius.full,
            bottom:           insets.bottom + spacing.lg,
            right:            spacing.lg,
          },
        ]}
        accessibilityLabel="Create new list"
        accessibilityRole="button"
      >
        <Text style={{ color: colors.bgPrimary, fontSize: 24, fontWeight: '600', lineHeight: 28 }}>+</Text>
      </Pressable>

      {/* Create / Edit sheet */}
      <CreateListSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        groupId={activeGroup?.id ?? ''}
        createdBy={myUid}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  header:  { paddingBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    gap:           8,
    flexWrap:      'wrap',
  },
  chip: {},
  listCard: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    flex:          1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    flex:          1,
  },
  progressPill: {
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  progressBar: {
    height: 4,
  },
  progressFill: {
    height: 4,
  },
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     80,
  },
  fab: {
    position:       'absolute',
    width:          56,
    height:         56,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.3,
    shadowRadius:   8,
    elevation:      8,
  },
})
