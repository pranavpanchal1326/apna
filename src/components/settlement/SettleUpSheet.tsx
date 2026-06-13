// src/components/settlement/SettleUpSheet.tsx
// Bottom sheet to confirm a settlement.
// Pre-fills the amount from the simplified debt.
// User can adjust the amount (partial settlement).
// On confirm → recordSettlement → optimistic update → close.

import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet,
} from 'react-native'
import { useTheme } from '@theme'
import { haptics } from '@lib/haptics'
import { BottomSheet } from '@components/ui/BottomSheet'
import { Button } from '@components/ui/Button'
import { Avatar } from '@components/ui/Avatar'
import type { DebtSimplified } from '@lib/engine/balanceEngine'
import type { UserInput } from '@lib/schemas'

interface Props {
  visible: boolean
  onClose: () => void
  debt: DebtSimplified | null         // The debt being settled
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

  const defaultAmount = debt ? debt.amountRupees.toFixed(2) : ''
  const [amountStr, setAmountStr] = useState(defaultAmount)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset when debt changes
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
      setError(`Maximum you can settle is ₹${maxAmount.toFixed(2)}`)
      return
    }

    try {
      await onConfirm(amount, note.trim())
      haptics.settleUp()
      setTimeout(() => {
        onClose()
      }, 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record settlement.')
    }
  }, [canConfirm, debt, amount, maxAmount, note, onConfirm, onClose])

  if (!debt || !toUser) return null

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Settle up"
      snapHeight={460}
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        {/* Who → Who */}
        <View style={[styles.parties, { marginBottom: spacing.xl }]}>
          <View style={styles.party}>
            <Avatar
              name={fromUser?.name ?? 'You'}
              color={fromUser?.avatarColor ?? '#4ECDC4'}
              imageUrl={fromUser?.photoUrl}
              size="lg"
            />
            <Text style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              You
            </Text>
          </View>
          <Text style={[text.heading.sm, { color: colors.textMuted, marginHorizontal: spacing.lg }]}>
            →
          </Text>
          <View style={styles.party}>
            <Avatar
              name={toUser.name}
              color={toUser.avatarColor}
              imageUrl={toUser.photoUrl}
              size="lg"
            />
            <Text style={[text.label.md, { color: colors.textSecondary, marginTop: spacing.xs }]} numberOfLines={1}>
              {toUser.name.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Amount input */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Amount
        </Text>
        <View style={[
          styles.amountRow,
          {
            backgroundColor: colors.bgTertiary,
            borderRadius: radius.md,
            borderColor: error ? colors.accentDanger : colors.border,
            borderWidth: 1,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.xs,
          },
        ]}>
          <Text style={[text.mono.md, { color: colors.textSecondary }]}>₹</Text>
          <TextInput
            value={amountStr}
            onChangeText={v => {
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
              fontSize: 28,
              color: colors.textPrimary,
              paddingVertical: spacing.md,
              paddingLeft: spacing.sm,
            }}
            accessibilityLabel="Settlement amount"
          />
        </View>

        {/* Max hint */}
        <Text style={[text.label.sm, { color: colors.textMuted, marginBottom: spacing.lg }]}>
          Full amount: ₹{maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>

        {/* Note */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Note (optional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. UPI transfer done"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
          returnKeyType="done"
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: colors.bgTertiary,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            minHeight: 52,
            marginBottom: spacing.xl,
          }}
          accessibilityLabel="Settlement note"
        />

        {/* Error */}
        {error && (
          <Text style={[text.label.sm, { color: colors.accentDanger, marginBottom: spacing.md, textAlign: 'center' }]}>
            {error}
          </Text>
        )}

        {/* Confirm */}
        <Button
          label={isSettling ? 'Recording…' : `Confirm ₹${amount > 0 ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0'} paid`}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canConfirm}
          loading={isSettling}
          onPress={handleConfirm}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  parties:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  party:     { alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
})
