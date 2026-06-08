// src/screens/group/tabs/FeedTab.tsx
// The main activity feed tab. Real-time list of all group activity.
// Handles loading, empty, error, and pagination states.

import { useCallback } from 'react'
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useTheme } from '@theme'
import { ActivityFeedItem } from '@components/group'
import { BalanceSummaryCard } from '@components/group'
import { MemberAvatarRow } from '@components/group'
import { useActivityFeed } from '@hooks/useActivityFeed'
import { useGroupMembers } from '@hooks/useGroupMembers'
import type { ActivityItem, GroupInput, SettlementBalance } from '@lib/schemas'

interface Props {
  group:     GroupInput
  myUid:     string
  balances:  SettlementBalance[]
  onSettle:  (withUid: string) => void
  onViewMembers: () => void
}

export function FeedTab({ group, myUid, balances, onSettle, onViewMembers }: Props) {
  const { colors, text, spacing } = useTheme()
  const { items, isLoading, isLoadingMore, hasMore, loadMore } = useActivityFeed(group.id)
  const { members } = useGroupMembers(group.memberIds)

  const handlePress = useCallback((_item: ActivityItem) => {
    // Navigate to expense detail in Prompt 1.4
    // navigation.navigate('ExpenseDetail', { expenseId: _item.metadata?.expenseId })
  }, [])

  const renderItem = useCallback(
    ({ item, index }: { item: ActivityItem; index: number }) => (
      <ActivityFeedItem
        item={item}
        members={members}
        isLast={index === items.length - 1}
        onPress={item.type === 'expense_added' ? handlePress : undefined}
      />
    ),
    [members, items.length, handlePress]
  )

  const ListHeader = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
      {/* Balance summary */}
      <BalanceSummaryCard
        myUid={myUid}
        balances={balances}
        members={members}
        onSettle={onSettle}
      />

      {/* Member avatars */}
      <MemberAvatarRow
        members={members}
        memberIds={group.memberIds}
        onPressAll={onViewMembers}
      />

      {/* Feed section header */}
      <Text
        style={[
          text.label.md,
          {
            color:        colors.textSecondary,
            marginBottom: spacing.md,
            letterSpacing: 1,
          },
        ]}
      >
        ACTIVITY
      </Text>
    </View>
  )

  const ListEmpty = !isLoading ? (
    <View style={[styles.emptyState, { paddingTop: spacing['3xl'] }]}>
      <Text style={{ fontSize: 40, marginBottom: spacing.md }}>💸</Text>
      <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        No activity yet
      </Text>
      <Text
        style={[
          text.body.md,
          { color: colors.textSecondary, textAlign: 'center', maxWidth: 240 },
        ]}
      >
        Add your first expense to get the group started.
      </Text>
    </View>
  ) : null

  const ListFooter =
    isLoadingMore ? (
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accentPrimary} />
      </View>
    ) : null

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  )
}

const styles = StyleSheet.create({
  emptyState: { alignItems: 'center', paddingHorizontal: 32 },
  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
