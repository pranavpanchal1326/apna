// src/components/settlement/SettleUpSheet.tsx
// Kora & Ink settle-up ceremony — Blueprint §4.6.2 / §3.11.
// debtor avatar — horizontal stitch — creditor avatar; editable Amount for
// partial settlement; UPI deep-link (apna never moves money) + "Mark ₹n
// settled" confirm. haptics.settleUp() fires the success haptic on record.

import { useState, useCallback, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { openUpiPayment } from '@lib/utils/upi'
import { useTheme } from '@theme'
import { haptics } from '@lib/haptics'
import { Sheet } from '@components/ui/Sheet'
import { Button } from '@components/ui/Button'
import { Avatar } from '@components/ui/Avatar'
import { Stitch } from '@components/ui/Stitch'
import { formatINR } from '@lib/utils/currency'
import type { DebtSimplified } from '@lib/engine/balanceEngine'
import type { UserInput } from '@lib/schemas'

interface Props {
  visible: boolean
  onClose: () => void
  debt: DebtSimplified | null
  fromUser: UserInput | undefined     // Payer (always the current user)
  toUser: UserInput | undefined       // Receiver
  groupId: string
  onConfirm: (amountRupees: number, note: string) => Promise<void>
  isSettling: boolean
}

export function SettleUpSheet({
  visible,
  onClose,
  debt,
  fromUser,
  toUser,
  onConfirm,
  isSettling,
}: Props) {
  const { colors, text, spacing, radius, fonts } = useTheme()

  const [amountStr, setAmountStr] = useState(debt ? debt.amountRupees.toFixed(2) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (debt) {
      setAmountStr(debt.amountRupees.toFixed(2))
      setNote('')
      setError(null)
    }
  }, [debt?.fromUid, debt?.toUid, debt?.amountPaise])

  const amount = parseFloat(amountStr) || 0
  const maxAmount = debt?.amountRupees ?? 0
  const canConfirm = amount > 0 && amount <= maxAmount + 0.01 && !isSettling

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !debt) return
    setError(null)
    if (amount > maxAmount + 0.01) {
      setError(`Most you can settle is ${formatINR(maxAmount)}.`)
      return
    }
    try {
      await onConfirm(amount, note.trim())
      haptics.settleUp()
      setTimeout(() => onClose(), 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the settlement. Retry.")
    }
  }, [canConfirm, debt, amount, maxAmount, note, onConfirm, onClose])

  // Deep-link the receiver's UPI app pre-filled; user records in apna after.
  const handlePayViaUpi = useCallback(async () => {
    if (!toUser?.upiId || amount <= 0) return
    const opened = await openUpiPayment({
      payeeVpa: toUser.upiId,
      payeeName: toUser.name,
      amountRupees: amount,
      note: note.trim() || 'apna settle up',
    })
    if (!opened) {
      Alert.alert('No UPI app found', 'Install GPay, PhonePe, or any UPI app to pay directly.')
    }
  }, [toUser?.upiId, toUser?.name, amount, note])

  if (!debt || !toUser) return null

  return (
    <Sheet visible={visible} onClose={onClose} title="Settle up">
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {/* Ceremony: debtor — stitch — creditor */}
        <View style={styles.ceremony}>
          <View style={styles.party}>
            <Avatar
              name={fromUser?.name ?? 'You'}
              color={fromUser?.avatarColor ?? colors.accentPrimary}
              imageUrl={fromUser?.photoUrl}
              size="lg"
            />
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]}>You</Text>
          </View>
          <View style={styles.stitchGap}>
            <Stitch />
          </View>
          <View style={styles.party}>
            <Avatar name={toUser.name} color={toUser.avatarColor} imageUrl={toUser.photoUrl} size="lg" />
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
              {toUser.name.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Editable amount (partial settlement) */}
        <View
          style={[
            styles.amountRow,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.soft,
              paddingHorizontal: spacing.md,
              marginTop: spacing.xl,
              marginBottom: spacing.xs,
            },
          ]}
        >
          <Text style={[text.mono.lg, { color: colors.textMuted }]}>₹</Text>
          <TextInput
            value={amountStr}
            onChangeText={(v) => {
              const cleaned = v.replace(/[^0-9.]/g, '')
              const parts = cleaned.split('.')
              const safe = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
              setAmountStr(safe)
              setError(null)
            }}
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
        <Text style={[text.label.sm, { color: colors.textMuted, marginBottom: spacing.lg }]}>
          Full amount: {formatINR(maxAmount)}
        </Text>

        {/* Note */}
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
          returnKeyType="done"
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: colors.bgTertiary,
            borderRadius: radius.soft,
            padding: spacing.md,
            minHeight: 52,
            marginBottom: spacing.lg,
          }}
          accessibilityLabel="Settlement note"
        />

        {error && (
          <Text style={[text.body.sm, { color: colors.warning, marginBottom: spacing.md, textAlign: 'center' }]}>
            {error}
          </Text>
        )}

        {/* Pay via UPI (deep-link) */}
        {toUser.upiId ? (
          <Button
            label={`Pay ${formatINR(amount > 0 ? amount : 0)} via UPI`}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={amount <= 0}
            onPress={handlePayViaUpi}
            style={{ marginBottom: spacing.sm }}
          />
        ) : (
          <Text style={[text.body.sm, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm }]}>
            {toUser.name.split(' ')[0]} hasn't added a UPI ID yet — ask them to set it in Profile for one-tap payment.
          </Text>
        )}

        {/* Confirm — the knot instead of confetti (§4.6.2) */}
        <Button
          label={isSettling ? 'Recording…' : `Mark ${formatINR(amount > 0 ? amount : 0)} settled`}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canConfirm}
          loading={isSettling}
          onPress={handleConfirm}
        />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  ceremony: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  party: { alignItems: 'center', width: 72 },
  stitchGap: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
})
