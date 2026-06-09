// src/screens/group/SettleUpScreen.tsx
import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, Header, Button } from '@components'
import { Avatar } from '@components/ui/Avatar'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuthStore } from '@stores/auth.store'
import { useSettlementStore } from '@stores/settlement.store'
import type { HomeStackParamList } from '@navigation/types'

type RouteProps = RouteProp<HomeStackParamList, 'SettleUp'>
type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'SettleUp'>

export function SettleUpScreen() {
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const route      = useRoute<RouteProps>()
  const currentUser = useAuthStore((s) => s.user)
  const myUid       = currentUser?.uid ?? ''

  const { groupId, withUid } = route.params
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const group = activeGroup?.id === groupId ? activeGroup : null

  // Fetch all members profiles
  const memberIds = useMemo(() => group?.memberIds ?? [], [group?.memberIds])
  const { members } = useGroupMembers(memberIds)

  // Filter members to only select counterparties (everyone except self)
  const counterparties = useMemo(() => {
    return Array.from(members.values()).filter((m) => m.uid !== myUid)
  }, [members, myUid])

  const [selectedUid, setSelectedUid] = useState<string>(withUid ?? '')
  const [amount, setAmount]           = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedMember = useMemo(() => {
    return selectedUid ? members.get(selectedUid) : null
  }, [selectedUid, members])

  // Get balance from group.balances
  // group.balances is: Array<{ fromUid: string, toUid: string, amount: number }>
  const suggestedAmount = useMemo(() => {
    if (!group || !selectedUid) return 0
    const balances = group.balances ?? []
    
    // Check if I owe them (fromUid = myUid, toUid = selectedUid)
    const iOwe = balances.find((b) => b.fromUid === myUid && b.toUid === selectedUid)
    if (iOwe) return iOwe.amount

    // Check if they owe me (fromUid = selectedUid, toUid = myUid)
    const theyOwe = balances.find((b) => b.fromUid === selectedUid && b.toUid === myUid)
    if (theyOwe) return -theyOwe.amount

    return 0
  }, [group, selectedUid, myUid])

  // Update input amount when suggested amount changes
  useEffect(() => {
    if (suggestedAmount > 0) {
      setAmount(String(suggestedAmount))
    } else {
      setAmount('')
    }
  }, [suggestedAmount])

  const summaryMessage = useMemo(() => {
    if (!selectedMember) return ''
    if (suggestedAmount > 0) {
      return `You owe ${selectedMember.name} ₹${suggestedAmount}`
    } else if (suggestedAmount < 0) {
      return `${selectedMember.name} owes you ₹${Math.abs(suggestedAmount)} — record only if money was already transferred`
    }
    return `No pending balance with ${selectedMember.name}`
  }, [selectedMember, suggestedAmount])

  const { createSettlement } = useSettlementStore()

  const handleConfirm = useCallback(async () => {
    const val = parseFloat(amount)
    if (!selectedUid) {
      Alert.alert('Selection Required', 'Please select a member to settle with.')
      return
    }
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      await createSettlement({
        groupId,
        fromUid: myUid,
        toUid: selectedUid,
        amount: val,
        currency: group?.currency ?? 'INR',
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      navigation.goBack()
    } catch (err: any) {
      Alert.alert('Could not save settlement', err.message ?? 'Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [groupId, myUid, selectedUid, amount, createSettlement, group?.currency, navigation])

  if (!group) {
    return (
      <Screen>
        <Header title="Settle Up" showBack />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.textMuted }]}>Group not found.</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title="Settle Up" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        
        {/* Counterparty Selector */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          SETTLE WITH
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
          <View style={styles.counterpartyRow}>
            {counterparties.map((m) => {
              const isSelected = m.uid === selectedUid
              return (
                <Pressable
                  key={m.uid}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setSelectedUid(m.uid)
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.accentPrimary + '20' : colors.bgSecondary,
                      borderColor:     isSelected ? colors.accentPrimary : colors.border,
                      borderRadius:    radius.full,
                      paddingHorizontal: spacing.md,
                      paddingVertical:   spacing.xs,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`Settle with ${m.name}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Avatar name={m.name} imageUrl={m.photoUrl} color={m.avatarColor} size="xs" />
                  <Text style={[text.body.sm, { color: isSelected ? colors.accentPrimary : colors.textPrimary, marginLeft: spacing.xs }]}>
                    {m.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        {selectedMember && (
          <View style={[styles.amountCard, {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.lg,
            borderColor:     colors.border,
            borderWidth:     1,
            padding:         spacing.lg,
            marginBottom:    spacing.xl,
            ...shadows.card,
            alignItems:      'center',
          }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              ENTER AMOUNT
            </Text>
            
            <View style={styles.amountInputRow}>
              <Text style={[text.heading.lg, { color: colors.textPrimary, fontSize: 32 }]}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[text.heading.lg, styles.input, { color: colors.textPrimary }]}
              />
            </View>

            {summaryMessage ? (
              <Text style={[text.label.md, { color: suggestedAmount > 0 ? colors.accentPrimary : colors.accentDanger, marginTop: spacing.md, textAlign: 'center' }]}>
                {summaryMessage}
              </Text>
            ) : null}
          </View>
        )}

        {selectedMember && (
          <View style={{ gap: spacing.md }}>
            <Button
              label={`Confirm Settlement`}
              variant="primary"
              onPress={handleConfirm}
              loading={isSubmitting}
              fullWidth
            />
            <Text style={[text.label.sm, { color: colors.textMuted, textAlign: 'center' }]}>
              This records a settlement and updates the group balance.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  counterpartyRow:    { flexDirection: 'row', gap: 8 },
  chip:               { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  amountCard:         { overflow: 'hidden' },
  amountInputRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  input:              { fontSize: 32, marginLeft: 4, width: 140, textAlign: 'center' },
})
