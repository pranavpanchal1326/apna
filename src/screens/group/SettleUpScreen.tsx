// src/screens/group/SettleUpScreen.tsx
// PRD §9.5 — Record payment confirmation screen.
// Shown when a user taps a settlement card.
// Either the payer or the recipient can mark as paid.

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '@theme'
import { Screen, Header, Button } from '@components'
import { Avatar } from '@components/ui/Avatar'
import { useBudget } from '@hooks/useBudget'
import { useAuthStore } from '@stores/auth.store'
import { formatAmount } from '@lib/utils/date'
import type { GroupStackParamList } from '@navigation/types'

type RouteProps = RouteProp<GroupStackParamList, 'SettleUp'>

export function SettleUpScreen() {
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation  = useNavigation<NativeStackNavigationProp<GroupStackParamList>>()
  const route       = useRoute<RouteProps>()
  const currentUser = useAuthStore((s) => s.user)

  const { groupId, fromUid, toUid, fromName, toName, amountPaise } = route.params
  const { handleRecordPayment } = useBudget(groupId)

  const [isLoading, setIsLoading] = useState(false)
  const amountStr = formatAmount(amountPaise / 100)

  const isMyPayment = fromUid === currentUser?.uid

  const handleConfirm = useCallback(async () => {
    Alert.alert(
      'Record payment?',
      `Mark ${fromName} → ${toName} (${amountStr}) as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as paid',
          style: 'default',
          onPress: async () => {
            setIsLoading(true)
            try {
              await handleRecordPayment(fromUid, toUid)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              navigation.goBack()
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to record payment.')
            } finally {
              setIsLoading(false)
            }
          },
        },
      ]
    )
  }, [fromUid, toUid, fromName, toName, amountStr])

  return (
    <Screen>
      <Header title="Settle Up" showBack />
      <View style={[styles.content, { padding: spacing.xl }]}>

        {/* Amount hero */}
        <View style={[styles.amountCard, {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.xl,
          padding: spacing['2xl'],
          marginBottom: spacing['2xl'],
          borderWidth: 1,
          borderColor: colors.borderAccent,
          ...shadows.elevated,
          alignItems: 'center',
        }]}>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            {isMyPayment ? 'You pay' : `${fromName} pays`}
          </Text>
          <Text style={[text.mono.lg, { color: colors.accentPrimary, fontSize: 40 }]}>
            {amountStr}
          </Text>
          <Text style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            to {toName}
          </Text>
        </View>

        {/* From → To visual */}
        <View style={[styles.avatarRow, { marginBottom: spacing['2xl'] }]}>
          <View style={styles.avatarCol}>
            <Avatar name={fromName} color={colors.accentDanger} size="xl" />
            <Text style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
              {isMyPayment ? 'You' : fromName}
            </Text>
          </View>
          <Text style={[text.heading.sm, { color: colors.textMuted, marginHorizontal: spacing.xl }]}>→</Text>
          <View style={styles.avatarCol}>
            <Avatar name={toName} color={colors.accentPrimary} size="xl" />
            <Text style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
              {toUid === currentUser?.uid ? 'You' : toName}
            </Text>
          </View>
        </View>

        {/* Confirm CTA */}
        <Button
          label="Mark as paid ✓"
          variant="primary"
          onPress={handleConfirm}
          loading={isLoading}
          fullWidth
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.md }}
          fullWidth
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content:    { flex: 1 },
  amountCard: {},
  avatarRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  avatarCol:  { alignItems: 'center' },
})
