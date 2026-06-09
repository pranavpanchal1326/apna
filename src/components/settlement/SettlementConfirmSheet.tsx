// src/components/settlement/SettlementConfirmSheet.tsx
// Bottom sheet that appears before recording a settlement.
// Shows: who, amount, payment method selector (Cash / UPI / Bank / Other),
// and an optional note field.
// Confirm → calls onConfirm() → parent calls recordSettlement().
//
// Difference from SettleUpSheet: adds payment method selection and is used
// specifically from SettleUpScreen (which drives the full settle-up flow).

import { memo, useState, useCallback } from 'react'
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme }       from '@theme'
import { BottomSheet }    from '@components/ui/BottomSheet'
import { Button }         from '@components/ui/Button'
import { Avatar }         from '@components/ui/Avatar'
import { formatINR }      from '@lib/utils/currency'

export type SettlementMethod = 'cash' | 'upi' | 'bank' | 'other'

interface Props {
  visible:     boolean
  onClose:     () => void
  toName:      string
  toColor:     string
  toPhotoURL?: string
  amount:      number        // Pre-filled from balance
  onConfirm:   (amount: number, method: SettlementMethod, note?: string) => Promise<void>
  isLoading:   boolean
}

const METHODS: { key: SettlementMethod; label: string; emoji: string }[] = [
  { key: 'cash', label: 'Cash',       emoji: '💵' },
  { key: 'upi',  label: 'UPI / GPay', emoji: '📲' },
  { key: 'bank', label: 'Bank',       emoji: '🏦' },
  { key: 'other',label: 'Other',      emoji: '💳' },
]

export const SettlementConfirmSheet = memo(function SettlementConfirmSheet({
  visible,
  onClose,
  toName,
  toColor,
  toPhotoURL,
  amount,
  onConfirm,
  isLoading,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [method, setMethod] = useState<SettlementMethod>('upi')
  const [note,   setNote]   = useState('')
  const displayName = toName.split(' ')[0]!

  const handleConfirm = useCallback(async () => {
    if (amount <= 0 || isLoading) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await onConfirm(amount, method, note.trim() || undefined)
  }, [amount, method, note, onConfirm, isLoading])

  const handleMethodSelect = useCallback((m: SettlementMethod) => {
    Haptics.selectionAsync()
    setMethod(m)
  }, [])

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Settle up"
      snapHeight={500}
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>

        {/* Who + Amount */}
        <View style={[styles.heroRow, { marginBottom: spacing.xl }]}>
          <Avatar
            name={toName}
            color={toColor}
            imageUrl={toPhotoURL}
            size="lg"
          />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[text.label.md, { color: colors.textSecondary }]}>
              Paying
            </Text>
            <Text style={[text.heading.md, { color: colors.textPrimary, marginTop: 2 }]}>
              {displayName}
            </Text>
          </View>
          <Text style={[text.mono.lg, { color: colors.accentPrimary, fontVariant: ['tabular-nums'] }]}>
            {formatINR(amount)}
          </Text>
        </View>

        {/* Payment method selector */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          HOW DID YOU PAY?
        </Text>
        <View style={[styles.methodGrid, { marginBottom: spacing.lg }]}>
          {METHODS.map((m) => {
            const isSelected = method === m.key
            return (
              <Pressable
                key={m.key}
                onPress={() => handleMethodSelect(m.key)}
                style={[
                  styles.methodBtn,
                  {
                    backgroundColor:  isSelected ? colors.bgTertiary : colors.bgSecondary,
                    borderRadius:     radius.md,
                    borderColor:      isSelected ? colors.accentPrimary : colors.border,
                    borderWidth:      isSelected ? 1.5 : 1,
                    paddingVertical:  spacing.sm,
                    flex:             1,
                    marginHorizontal: 3,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={m.label}
              >
                <Text style={{ fontSize: 20, textAlign: 'center' }}>{m.emoji}</Text>
                <Text
                  style={[
                    text.label.sm,
                    {
                      color:     isSelected ? colors.accentPrimary : colors.textSecondary,
                      textAlign: 'center',
                      marginTop: 4,
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Optional note */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          NOTE (OPTIONAL)
        </Text>
        <View
          style={[
            styles.noteInput,
            {
              backgroundColor:   colors.bgTertiary,
              borderRadius:      radius.md,
              borderColor:       colors.border,
              borderWidth:       1,
              marginBottom:      spacing.lg,
              paddingHorizontal: spacing.md,
              paddingVertical:   spacing.sm,
            },
          ]}
        >
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Paid via GPay"
            placeholderTextColor={colors.textMuted}
            style={[text.body.sm, { color: colors.textPrimary }]}
            maxLength={100}
            returnKeyType="done"
          />
        </View>

        {/* Confirm button */}
        <Button
          variant="primary"
          size="lg"
          label={isLoading ? 'Recording…' : `Confirm ${formatINR(amount)} paid`}
          onPress={handleConfirm}
          loading={isLoading}
          disabled={amount <= 0 || isLoading}
          fullWidth
        />

      </View>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  heroRow:    { flexDirection: 'row', alignItems: 'center' },
  methodGrid: { flexDirection: 'row' },
  methodBtn:  { alignItems: 'center' },
  noteInput:  {},
})
