// src/screens/group/SettleUpScreen.tsx
// Kora & Ink settle-up screen — Blueprint §4.6.2. The routed full-screen
// counterpart to SettleUpSheet: pick a counterparty, then the debtor—stitch—
// creditor ceremony with an editable amount and the "Mark ₹n settled" knot.
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
import { haptics } from '@lib/haptics'
import { Screen, Header, Button, StitchLabel, Entrance } from '@components'
import { Avatar } from '@components/ui/Avatar'
import { Stitch } from '@components/ui/Stitch'
import { formatINR } from '@lib/utils/currency'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuthStore } from '@stores/auth.store'
import { useSettlementStore } from '@stores/settlement.store'
import type { HomeStackParamList } from '@navigation/types'

type RouteProps = RouteProp<HomeStackParamList, 'SettleUp'>
type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'SettleUp'>

export function SettleUpScreen() {
  const { colors, spacing, radius, text, fonts } = useTheme()
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

  const me = myUid ? members.get(myUid) : null
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
    const firstName = selectedMember.name.split(' ')[0]
    if (suggestedAmount > 0) {
      return `You owe ${firstName} ${formatINR(suggestedAmount)}`
    } else if (suggestedAmount < 0) {
      return `${firstName} owes you ${formatINR(Math.abs(suggestedAmount))} — record only if money was already transferred`
    }
    return `No pending balance with ${firstName}`
  }, [selectedMember, suggestedAmount])

  const summaryColor = suggestedAmount > 0
    ? colors.negative      // money in motion — you owe
    : suggestedAmount < 0
      ? colors.positive    // owed to you
      : colors.textMuted

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

      haptics.settleUp()
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
        <Header title="Settle up" showBack />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.textMuted }]}>Group not found.</Text>
        </View>
      </Screen>
    )
  }

  const parsedAmount = parseFloat(amount) || 0

  return (
    <Screen>
      <Header title="Settle up" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">

        {/* Counterparty selector */}
        <Entrance index={0}>
          <StitchLabel label="Settle with" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
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
                        backgroundColor: colors.bgTertiary,
                        borderColor:     isSelected ? colors.stitch : colors.hairline,
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
                    <Text style={[text.body.sm, { color: colors.textPrimary, marginLeft: spacing.xs }]}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </Entrance>

        {selectedMember && (
          <Entrance index={1}>
            {/* Ceremony: debtor — stitch — creditor (§4.6.2) */}
            <View style={styles.ceremony}>
              <View style={styles.party}>
                <Avatar
                  name={me?.name ?? 'You'}
                  color={me?.avatarColor ?? colors.stitch}
                  imageUrl={me?.photoUrl}
                  size="lg"
                />
                <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]}>You</Text>
              </View>
              <View style={styles.stitchGap}>
                <Stitch />
              </View>
              <View style={styles.party}>
                <Avatar name={selectedMember.name} color={selectedMember.avatarColor} imageUrl={selectedMember.photoUrl} size="lg" />
                <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
                  {selectedMember.name.split(' ')[0]}
                </Text>
              </View>
            </View>

            {/* Editable amount */}
            <View
              style={[
                styles.amountRow,
                {
                  backgroundColor: colors.bgTertiary,
                  borderRadius:    radius.soft,
                  paddingHorizontal: spacing.md,
                  marginTop:       spacing.xl,
                  marginBottom:    spacing.sm,
                },
              ]}
            >
              <Text style={[text.mono.lg, { color: colors.textMuted }]}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={{
                  flex: 1,
                  fontFamily: fonts.mono,
                  fontSize: 26,
                  color: colors.textPrimary,
                  paddingVertical: spacing.md,
                  paddingLeft: spacing.sm,
                }}
                accessibilityLabel="Settlement amount"
              />
            </View>

            {summaryMessage ? (
              <Text style={[text.body.sm, { color: summaryColor, marginBottom: spacing.xl, textAlign: 'center' }]}>
                {summaryMessage}
              </Text>
            ) : null}
          </Entrance>
        )}

        {selectedMember && (
          <Entrance index={2}>
            <View style={{ gap: spacing.sm }}>
              {/* Confirm — the knot, not confetti (§4.6.2) */}
              <Button
                label={isSubmitting ? 'Recording…' : `Mark ${formatINR(parsedAmount)} settled`}
                variant="primary"
                size="lg"
                onPress={handleConfirm}
                loading={isSubmitting}
                disabled={parsedAmount <= 0}
                fullWidth
              />
              <Text style={[text.label.sm, { color: colors.textMuted, textAlign: 'center' }]}>
                This records a settlement and updates the group balance.
              </Text>
            </View>
          </Entrance>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  counterpartyRow: { flexDirection: 'row', gap: 8 },
  chip:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  ceremony:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 },
  party:           { alignItems: 'center', width: 72 },
  stitchGap:       { flex: 1, height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  amountRow:       { flexDirection: 'row', alignItems: 'center' },
})
