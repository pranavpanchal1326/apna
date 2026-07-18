// src/screens/hangouts/HangoutsScreen.tsx
// Group-scoped list of all hangouts — upcoming, confirmed, past, canceled.
// Filtered to active group. FAB to propose.

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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { Confetti, CalendarBlank, ClockCounterClockwise, ForkKnife } from 'phosphor-react-native'
import { useTheme } from '../../theme'
import { useHangoutStore } from '../../stores/hangout.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { ProposeSheet } from './components/ProposeSheet'
import { DietarySuggestSheet } from './components/DietarySuggestSheet'
import { HangoutCard } from './components/HangoutCard'
import { hangoutDisplayState } from '../../lib/utils/hangout'
import type { Hangout, HangoutCreate } from '../../lib/schemas/hangout.schema'
import type { HangoutsStackParamList } from '../../navigation/types'

type Nav = NativeStackNavigationProp<HangoutsStackParamList>

type FilterKey = 'active' | 'past'

export function HangoutsScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()

  const myUid       = useAuthStore((s) => s.user?.uid ?? '')
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const groupSize   = activeGroup?.memberIds?.length ?? 4

  const { hangouts, isLoading, proposeHangout, subscribeToGroup } = useHangoutStore()

  const [filter,     setFilter]     = useState<FilterKey>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [showFoodIdeas, setShowFoodIdeas] = useState(false) // 7.5 dietary suggestions

  useEffect(() => {
    if (activeGroup?.id) subscribeToGroup(activeGroup.id)
  }, [activeGroup?.id, subscribeToGroup])

  const filtered = hangouts.filter((h) => {
    const state = hangoutDisplayState(h)
    if (filter === 'active') return state === 'upcoming' || state === 'confirmed'
    return state === 'past' || state === 'canceled'
  })

  const handlePropose = useCallback(async (data: HangoutCreate) => {
    if (!activeGroup?.id) return
    const hangoutId = await proposeHangout(activeGroup.id, data)
    setShowCreate(false)
    navigation.navigate('HangoutDetail', { hangoutId, title: data.title })
  }, [activeGroup?.id, proposeHangout, navigation])

  const handlePress = useCallback((h: Hangout) => {
    Haptics.selectionAsync()
    navigation.navigate('HangoutDetail', { hangoutId: h.id, title: h.title })
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: Hangout }) => (
    <HangoutCard hangout={item} myUid={myUid} onPress={() => handlePress(item)} />
  ), [myUid, handlePress])

  const renderEmpty = () => (
    <View style={[styles.empty, { paddingHorizontal: spacing.xl }]}>
      <Confetti size={48} color={colors.textMuted} />
      <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
        {filter === 'active' ? 'No plans yet' : 'No past hangouts'}
      </Text>
      <Text style={[text.body.md, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
        {filter === 'active'
          ? 'Propose a dinner, chai, movie — anything. The group votes.'
          : `Once hangouts pass, they'll show up here.`}
      </Text>
    </View>
  )

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
        <Text style={[text.heading.md, { color: colors.textPrimary }]}>Hangouts</Text>
        {activeGroup && (
          <Text style={[text.label.sm, { color: colors.textMuted }]}>{activeGroup.name}</Text>
        )}
      </View>

      {/* Filter chips */}
      <View style={[styles.filterRow, { paddingHorizontal: spacing.md, marginVertical: spacing.sm }]}>
        {(['active', 'past'] as FilterKey[]).map((f) => {
          const active = filter === f
          const label  = f === 'active' ? 'Upcoming' : 'Past'
          const chipColor = active ? colors.accentPrimary : colors.textSecondary
          return (
            <Pressable
              key={f}
              onPress={() => { Haptics.selectionAsync(); setFilter(f) }}
              style={[styles.chip, {
                flexDirection:   'row',
                alignItems:      'center',
                gap:             5,
                backgroundColor: active ? colors.accentPrimary + '22' : colors.bgSecondary,
                borderColor:     active ? colors.accentPrimary         : colors.hairline,
                borderRadius:    radius.full,
                borderWidth:     1,
                paddingHorizontal: 12,
                paddingVertical:  6,
              }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              {f === 'active'
                ? <CalendarBlank size={14} color={chipColor} />
                : <ClockCounterClockwise size={14} color={chipColor} />}
              <Text style={[text.label.sm, { color: chipColor, fontFamily: 'Outfit-Medium' }]}>
                {label}
              </Text>
            </Pressable>
          )
        })}

        {/* 7.5 Dietary food ideas — needs a destination for context */}
        {activeGroup?.destination ? (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowFoodIdeas(true) }}
            style={[styles.chip, {
              backgroundColor: colors.bgSecondary,
              borderColor:     colors.border,
              borderRadius:    radius.full,
              borderWidth:     1,
              paddingHorizontal: 12,
              paddingVertical:  6,
            }]}
            accessibilityRole="button"
            accessibilityLabel="Get dietary-friendly food ideas"
          >
            <View style={styles.foodIdeasRow}>
              <ForkKnife size={14} color={colors.textSecondary} />
              <Text style={[text.label.sm, { color: colors.textSecondary, fontFamily: 'Outfit-Medium' }]}>
                Food ideas
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          setShowCreate(true)
        }}
        style={[styles.fab, {
          backgroundColor: colors.accentPrimary,
          borderRadius:    radius.full,
          bottom:          insets.bottom + spacing.lg,
          right:           spacing.lg,
        }]}
        accessibilityLabel="Propose a hangout"
        accessibilityRole="button"
      >
        <Text style={{ color: colors.bgPrimary, fontSize: 24, fontWeight: '600', lineHeight: 28 }}>+</Text>
      </Pressable>

      {activeGroup?.destination ? (
        <DietarySuggestSheet
          visible={showFoodIdeas}
          onClose={() => setShowFoodIdeas(false)}
          groupId={activeGroup.id}
          destination={activeGroup.destination}
        />
      ) : null}

      <ProposeSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handlePropose}
        groupId={activeGroup?.id ?? ''}
        proposedBy={myUid}
        groupSize={groupSize}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  foodIdeasRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  screen:    { flex: 1 },
  header:    { paddingBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8 },
  chip:      {},
  empty:     { paddingTop: 80, alignItems: 'center' },
  fab:       {
    position:       'absolute',
    width:          56,
    height:         56,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    'rgba(0,0,0,1)',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.3,
    shadowRadius:   8,
    elevation:      8,
  },
})
