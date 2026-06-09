// src/screens/group/GroupHomeScreen.tsx
// Full group home — GroupHeaderHero + GroupNavigator (custom inner tab navigator).
// Settlement balances fetched from group document (recalculated by Cloud Function).

import { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, FAB } from '@components'
import { GroupHeaderHero } from '@components/group'
import { GroupNavigator } from '@navigation/GroupNavigator'
import { useActiveGroup } from '@hooks/useGroups'
import { useAuth } from '@hooks/useAuth'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'GroupHome'>

export function GroupHomeScreen({ route, navigation }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing } = useTheme()
  const { user }  = useAuth()
  const group     = useActiveGroup(groupId)

  const handleSettle = useCallback((_withUid: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('SettleUp', { groupId, withUid: _withUid })
  }, [navigation, groupId])

  if (!group) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading squad...
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={{ position: 'relative' }}>
      {/* Header hero */}
      <GroupHeaderHero group={group} />

      {/* Group navigator tabs (Feed / Members) */}
      <GroupNavigator
        group={group}
        myUid={user?.uid ?? ''}
        balances={group.balances ?? []}
        onSettle={handleSettle}
      />

      {/* FAB to add expense */}
      <FAB
        icon={<Text style={{ fontSize: 24, color: colors.bgPrimary, fontWeight: '600', lineHeight: 28 }}>+</Text>}
        onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
        accessibilityLabel="Add expense"
        style={{ position: 'absolute', bottom: 80, right: spacing.lg }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
  },
})
