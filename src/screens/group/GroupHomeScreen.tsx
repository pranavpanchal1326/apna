// src/screens/group/GroupHomeScreen.tsx
// Kora & Ink group hub — Blueprint §4.3.1.
// Signature moment: the my-position strip — every group screen leads with what
// it means for *you*. Law 3 madder slots: (1) FAB "Add expense", (2) tab
// stitch, (3) my-position amount.

import { useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { CaretRight } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { Screen, FAB, Row, Amount, Button, Card, ThreadKnot, Entrance } from '@components'
import { GroupHeaderHero } from '@components/group'
import { GroupNavigator } from '@navigation/GroupNavigator'
import { useActiveGroup } from '@hooks/useGroups'
import { useAuth } from '@hooks/useAuth'
import { getCachedTripWrap } from '../../lib/utils/tripWrapData'
import { groupNetForUser, netTone } from '@lib/utils/netPosition'
import { SkeletonRow } from '@components'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'GroupHome'>

export function GroupHomeScreen({ route, navigation }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, layout } = useTheme()
  const { user } = useAuth()
  const group = useActiveGroup(groupId)

  const handleSettle = useCallback(
    (_withUid: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      navigation.navigate('SettleUp', { groupId, withUid: _withUid })
    },
    [navigation, groupId]
  )

  const openSettleUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('SettleUp', { groupId })
  }, [navigation, groupId])

  const isTripOver =
    group?.status === 'completed' ||
    (group?.endDate ? new Date(group.endDate) < new Date() : false)
  const hasCachedWrap = group ? Boolean(getCachedTripWrap(group.id)) : false

  if (!group) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: layout.screenPaddingH, paddingTop: spacing['3xl'] }}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </View>
      </Screen>
    )
  }

  const myNet = groupNetForUser(group.balances, user?.uid)
  const tone = netTone(myNet)

  return (
    <Screen style={{ position: 'relative' }}>
      {/* Header hero */}
      <GroupHeaderHero group={group} />

      {/* My-position strip — leads with what this trip means for you (§4.3.1).
          The focal element; lands first, card and FAB assemble behind it. */}
      <Entrance index={0}>
      <View style={{ paddingHorizontal: layout.screenPaddingH, marginTop: spacing.lg }}>
        {tone === 'settled' ? (
          <Row
            title="Sab barabar."
            titleNode={
              <Text style={[text.body.lg, { color: colors.settled }]}>Sab barabar.</Text>
            }
            leading={<ThreadKnot size={22} color={colors.settled} />}
          />
        ) : (
          <Row
            title={tone === 'owed' ? "You're owed in this trip" : 'You owe in this trip'}
            trailing={
              <View style={styles.stripTrailing}>
                <Amount value={Math.abs(myNet)} size="md" signed
                  color={tone === 'owed' ? colors.positive : colors.negative} />
                <Button label="Settle" variant="ghost" size="sm" onPress={openSettleUp} />
              </View>
            }
          />
        )}
      </View>
      </Entrance>

      {/* Trip Wrap prompt — money-moment card, no emoji chrome (§4.3.1) */}
      {isTripOver && (
        <Entrance index={1}>
        <Card
          intent="money-moment"
          onPress={() => navigation.navigate('TripWrap', { groupId })}
          style={{ marginHorizontal: layout.screenPaddingH, marginTop: spacing.md }}
          accessibilityLabel="Open your trip, wrapped"
        >
          <View style={styles.wrapRow}>
            <View style={{ flex: 1 }}>
              <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                Your trip, wrapped
              </Text>
              <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
                {hasCachedWrap ? 'Relive the stats and moments.' : 'The stats and moments, sewn together.'}
              </Text>
            </View>
            <CaretRight size={20} color={colors.textMuted} />
          </View>
        </Card>
        </Entrance>
      )}

      {/* Group navigator tabs (Feed / Members) */}
      <GroupNavigator
        group={group}
        myUid={user?.uid ?? ''}
        balances={group.balances ?? []}
        onSettle={handleSettle}
      />

      {/* FAB to add expense — thread-add pill (Law 3 slot 1). Lands last. */}
      <Entrance delay={300} distance={14}
        style={{ position: 'absolute', bottom: 80, right: layout.screenPaddingH }}>
        <FAB
          label="Add expense"
          onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
          accessibilityLabel="Add expense"
        />
      </Entrance>
    </Screen>
  )
}

const styles = StyleSheet.create({
  stripTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
