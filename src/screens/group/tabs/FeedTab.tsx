// src/screens/group/tabs/FeedTab.tsx
// Kora & Ink activity feed — Blueprint §4.3.2. The canonical stitch surface.
// A vertical stitch runs down the left gutter sewing the day's events together;
// the current day's segment is live madder, older days turn dim. Day
// boundaries are StitchLabels (— — — TODAY / YESTERDAY / date). Money events
// carry amounts; life (joins, photos) stays quiet.

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { FlatList, View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { haptics } from '@lib/haptics'
import { ActivityFeedItem, MemberAvatarRow } from '@components/group'
import { StitchLabel, EmptyState, SkeletonRow, Entrance } from '@components'
import { useActivityFeed } from '@hooks/useActivityFeed'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { Timestamp } from 'firebase/firestore'
import type { ActivityItem, GroupInput, SettlementBalance } from '@lib/schemas'

interface Props {
  group:    GroupInput
  // myUid / balances / onSettle now surface on the GroupHome my-position strip
  // (§4.3.1); kept in props for GroupNavigator's shared signature.
  myUid?:    string
  balances?: SettlementBalance[]
  onSettle?: (withUid: string) => void
  onViewMembers: () => void
}

// ── Day bucketing ────────────────────────────────────────────────
type FeedRow =
  | { kind: 'label'; key: string; label: string; tone: 'live' | 'dim' }
  | { kind: 'item'; key: string; item: ActivityItem; isLast: boolean; tone: 'live' | 'dim' }

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(d: Date, now: Date): string {
  const today = dayKey(now)
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (dayKey(d) === today) return 'Today'
  if (dayKey(d) === dayKey(yest)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function buildRows(items: ActivityItem[]): FeedRow[] {
  const now = new Date()
  const todayKey = dayKey(now)
  const rows: FeedRow[] = []
  let currentKey: string | null = null
  let bucket: ActivityItem[] = []

  const flush = () => {
    if (!bucket.length) return
    const first = (bucket[0].createdAt as unknown as Timestamp)
    const d = first?.toDate ? first.toDate() : now
    const tone: 'live' | 'dim' = dayKey(d) === todayKey ? 'live' : 'dim'
    rows.push({ kind: 'label', key: `label-${dayKey(d)}`, label: dayLabel(d, now), tone })
    bucket.forEach((it, i) =>
      rows.push({ kind: 'item', key: it.id, item: it, isLast: i === bucket.length - 1, tone })
    )
    bucket = []
  }

  for (const it of items) {
    const ts = it.createdAt as unknown as Timestamp
    const d = ts?.toDate ? ts.toDate() : now
    const k = dayKey(d)
    if (k !== currentKey) { flush(); currentKey = k }
    bucket.push(it)
  }
  flush()
  return rows
}

export function FeedTab({ group, onViewMembers }: Props) {
  const navigation = useNavigation<any>()
  const { items, isLoading, isLoadingMore, hasMore, loadMore } = useActivityFeed(group.id)
  const { members } = useGroupMembers(group.memberIds)

  const seenItemIds = useRef<Set<string>>(new Set())
  const isInitialLoaded = useRef(false)

  useEffect(() => {
    if (isLoading) { isInitialLoaded.current = false; return }
    if (!isInitialLoaded.current) {
      seenItemIds.current = new Set(items.map((item) => item.id))
      isInitialLoaded.current = true
      return
    }
    if (isLoadingMore) { items.forEach((item) => seenItemIds.current.add(item.id)); return }

    let joinedCount = 0
    items.forEach((item) => {
      if (!seenItemIds.current.has(item.id)) {
        seenItemIds.current.add(item.id)
        if (item.type === 'member_joined') joinedCount++
      }
    })
    if (joinedCount > 0) haptics.memberJoined()
  }, [items, isLoading, isLoadingMore])

  const handlePress = useCallback(
    (_item: ActivityItem) => {
      if (_item.metadata?.expenseId) {
        navigation.navigate('ExpenseDetail', { groupId: group.id, expenseId: _item.metadata.expenseId })
      }
    },
    [navigation, group.id]
  )

  const rows = useMemo(() => buildRows(items), [items])

  const renderRow = useCallback(
    ({ item: row }: { item: FeedRow }) => {
      if (row.kind === 'label') {
        return (
          <View style={styles.labelWrap}>
            <StitchLabel label={row.label} tone={row.tone} />
          </View>
        )
      }
      return (
        <ActivityFeedItem
          item={row.item}
          members={members}
          isLast={row.isLast}
          tone={row.tone}
          onPress={row.item.type === 'expense_added' ? handlePress : undefined}
        />
      )
    },
    [members, handlePress]
  )

  // Only the header gets an entrance rise. The feed rows deliberately do NOT
  // stagger: the vertical day-stitch in the gutter owns the motion story here
  // (§4.3.2) and a per-row translateY would fight the stitch's continuity.
  const ListHeader = (
    <Entrance index={0}>
      <View style={styles.header}>
        <MemberAvatarRow
          members={members}
          memberIds={group.memberIds}
          onPressAll={onViewMembers}
        />
      </View>
    </Entrance>
  )

  if (isLoading) {
    return (
      <View style={styles.pad}>
        {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} index={i} />)}
      </View>
    )
  }

  if (rows.length === 0) {
    return (
      <View style={styles.flex}>
        {ListHeader}
        <EmptyState
          title="Nothing sewn yet."
          description="Add the first expense and the feed begins."
        />
      </View>
    )
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      ListHeaderComponent={ListHeader}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isLoadingMore ? <View style={styles.pad}><SkeletonRow index={0} /></View> : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 16 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  labelWrap: { paddingHorizontal: 20 },
})
