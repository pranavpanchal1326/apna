// src/screens/group/tabs/MembersTab.tsx
// Full member list with role badges (admin / member), balance per person,
// and remove/transfer-admin actions for group admin.

import { useCallback } from 'react'
import {
  FlatList,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import { useGroupMembers } from '@hooks/useGroupMembers'
import type { GroupInput, SettlementBalance } from '@lib/schemas'
import { formatINR } from '@lib/utils/currency'

interface Props {
  group:    GroupInput
  myUid:    string
  balances: SettlementBalance[]
  onSettle: (withUid: string) => void
}

export function MembersTab({ group, myUid, balances, onSettle }: Props) {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const { members } = useGroupMembers(group.memberIds)

  // Calculate each member's net balance relative to current user
  const getBalance = useCallback(
    (uid: string): number => {
      if (uid === myUid) return 0
      let net = 0
      balances.forEach((b) => {
        if (b.fromUid === myUid && b.toUid === uid) net -= b.amount
        if (b.fromUid === uid  && b.toUid === myUid) net += b.amount
      })
      return net
    },
    [balances, myUid]
  )

  const renderMember = useCallback(
    ({ item: uid }: { item: string }) => {
      const user    = members.get(uid)
      const balance = getBalance(uid)
      const isSelf  = uid === myUid
      const isGroupAdmin = group.adminIds?.includes(uid)

      if (!user) return null

      return (
        <View
          style={[
            styles.memberRow,
            {
              backgroundColor: colors.bgSecondary,
              borderRadius:    radius.lg,
              borderColor:     colors.border,
              borderWidth:     1,
              padding:         spacing.md,
              marginBottom:    spacing.sm,
              ...shadows.card,
            },
          ]}
        >
          <Avatar
            name={user.name}
            imageUrl={user.photoUrl}
            color={user.avatarColor ?? '#4ECDC4'}
            size="md"
          />

          <View style={[styles.memberInfo, { marginLeft: spacing.md, flex: 1 }]}>
            <View style={styles.nameRow}>
              <Text
                style={[text.body.md, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {user.name}
                {isSelf ? ' (you)' : ''}
              </Text>
              {isGroupAdmin && (
                <View
                  style={[
                    styles.adminBadge,
                    {
                      backgroundColor: `${colors.accentGold}20`,
                      borderRadius:    radius.full,
                      paddingHorizontal: 6,
                      paddingVertical:   2,
                      marginLeft:        spacing.xs,
                    },
                  ]}
                >
                  <Text style={[text.label.sm, { color: colors.accentGold }]}>
                    admin
                  </Text>
                </View>
              )}
            </View>

            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
              {user.phone ?? ''}
            </Text>
          </View>

          {/* Balance vs this member */}
          {!isSelf && Math.abs(balance) >= 1 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  text.mono.sm,
                  { color: balance > 0 ? colors.positive : colors.negative },
                ]}
              >
                {balance > 0 ? '+' : '−'}{formatINR(Math.abs(balance))}
              </Text>
              {balance < 0 && (
                <Pressable
                  onPress={() => onSettle(uid)}
                  style={[
                    styles.payBtn,
                    {
                      backgroundColor: colors.accentPrimary,
                      borderRadius:    radius.sm,
                      paddingHorizontal: spacing.sm,
                      paddingVertical:   4,
                      marginTop:         4,
                      minHeight:         28,
                      justifyContent:    'center',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Settle up with ${user.name}`}
                >
                  <Text style={[text.label.sm, { color: colors.bgPrimary }]}>
                    Pay
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )
    },
    [members, colors, text, spacing, radius, shadows, myUid, getBalance, onSettle, group.adminIds]
  )

  return (
    <FlatList
      data={group.memberIds}
      keyExtractor={(uid) => uid}
      renderItem={renderMember}
      contentContainerStyle={{
        padding:       spacing.lg,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberInfo: {},
  nameRow:   { flexDirection: 'row', alignItems: 'center' },
  adminBadge: {},
  payBtn:    {},
})
