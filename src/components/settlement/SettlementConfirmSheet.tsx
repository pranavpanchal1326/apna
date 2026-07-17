// src/components/settlement/SettlementConfirmSheet.tsx
// Kora & Ink settle-up ceremony sheet — Blueprint §4.6.2 / §3.11.
// debtor avatar — horizontal stitch — creditor avatar; Amount centered;
// method Rows (no emoji tiles); "Mark ₹450 settled" primary. On confirm the
// parent records the settlement and plays the sew + knot + success haptic.

import { memo, useState, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Money, DeviceMobile, Bank, CreditCard, Check } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { Sheet } from '@components/ui/Sheet'
import { Button } from '@components/ui/Button'
import { Row } from '@components/ui/Row'
import { IconTile } from '@components/ui/IconTile'
import { Avatar } from '@components/ui/Avatar'
import { Amount } from '@components/ui/Amount'
import { Stitch } from '@components/ui/Stitch'
import { formatINR } from '@lib/utils/currency'

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
  /** The paying user's name/color for the ceremony's debtor avatar. */
  fromName?:   string
  fromColor?:  string
}

const METHODS: {
  key: SettlementMethod
  label: string
  Icon: typeof Money
}[] = [
  { key: 'upi',  label: 'UPI / GPay',        Icon: DeviceMobile },
  { key: 'cash', label: 'Cash / already paid', Icon: Money },
  { key: 'bank', label: 'Bank transfer',     Icon: Bank },
  { key: 'other', label: 'Other',            Icon: CreditCard },
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
  fromName = 'You',
  fromColor,
}: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [method, setMethod] = useState<SettlementMethod>('upi')
  const [note, setNote] = useState('')

  const handleConfirm = useCallback(async () => {
    if (amount <= 0 || isLoading) return
    // The success haptic + stitch-sew land in the ceremony after recording.
    await onConfirm(amount, method, note.trim() || undefined)
  }, [amount, method, note, onConfirm, isLoading])

  const handleMethodSelect = useCallback((m: SettlementMethod) => {
    Haptics.selectionAsync()
    setMethod(m)
  }, [])

  return (
    <Sheet visible={visible} onClose={onClose} title="Settle up">
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {/* Ceremony: debtor — stitch — creditor, amount centered (§3.11) */}
        <View style={styles.ceremony}>
          <View style={styles.avatarCol}>
            <Avatar name={fromName} color={fromColor ?? colors.accentPrimary} size="lg" />
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
              {fromName.split(' ')[0]}
            </Text>
          </View>
          <View style={styles.stitchGap}>
            <Stitch />
          </View>
          <View style={styles.avatarCol}>
            <Avatar name={toName} color={toColor} imageUrl={toPhotoURL} size="lg" />
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
              {toName.split(' ')[0]}
            </Text>
          </View>
        </View>

        <View style={[styles.amountWrap, { marginTop: spacing.lg, marginBottom: spacing.xl }]}>
          <Amount value={amount} size="lg" />
        </View>

        {/* Method Rows — no emoji tiles */}
        {METHODS.map((m) => {
          const isSelected = method === m.key
          const Icon = m.Icon
          return (
            <Row
              key={m.key}
              dense
              title={m.label}
              onPress={() => handleMethodSelect(m.key)}
              leading={
                <IconTile>
                  <Icon size={20} color={isSelected ? colors.accentPrimary : colors.textSecondary} />
                </IconTile>
              }
              trailing={isSelected ? <Check size={18} color={colors.accentPrimary} /> : undefined}
            />
          )
        })}

        {/* Optional note */}
        <View
          style={[
            styles.noteInput,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.soft,
              marginTop: spacing.md,
              marginBottom: spacing.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.textMuted}
            style={[text.body.sm, { color: colors.textPrimary }]}
            maxLength={100}
            returnKeyType="done"
          />
        </View>

        {/* Confirm — the CTA carries the amount (§4.6.2) */}
        <Button
          variant="primary"
          size="lg"
          label={isLoading ? 'Recording…' : `Mark ${formatINR(amount)} settled`}
          onPress={handleConfirm}
          loading={isLoading}
          disabled={amount <= 0 || isLoading}
          fullWidth
        />
      </View>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  ceremony: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  avatarCol: {
    alignItems: 'center',
    width: 72,
  },
  stitchGap: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  amountWrap: {
    alignItems: 'center',
  },
  noteInput: {},
})
