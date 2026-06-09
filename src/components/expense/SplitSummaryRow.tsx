// src/components/expense/SplitSummaryRow.tsx
// Per-person split amount row — shown in the split preview section.
// For 'equal': shows calculated amount (read-only)
// For 'exact': shows editable input for each person's amount
// For 'percentage': shows editable percentage input

import { memo } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'
import type { UserInput } from '@lib/schemas'
import { formatINR } from '@lib/utils/currency'

interface Props {
  user:       UserInput
  method:     'equal' | 'exact' | 'percentage'
  amount?:    number    // For 'equal': calculated amount (display only)
  value?:     number    // For 'exact'/'percentage': editable input value
  isPayer?:   boolean
  onChangeValue?: (uid: string, value: number) => void
}

export const SplitSummaryRow = memo(function SplitSummaryRow({
  user,
  method,
  amount,
  value,
  isPayer,
  onChangeValue,
}: Props) {
  const { colors, text, spacing, radius, fonts } = useTheme()

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.sm,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
      ]}
    >
      <Avatar
        name={user.name}
        imageUrl={user.photoUrl}
        color={user.avatarColor}
        size="sm"
      />

      <Text
        style={[
          text.body.sm,
          { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm },
        ]}
        numberOfLines={1}
      >
        {user.name.split(' ')[0]}
        {isPayer ? (
          <Text style={{ color: colors.accentGold }}> · paid</Text>
        ) : null}
      </Text>

      {/* Amount display / input */}
      {method === 'equal' ? (
        <Text style={[text.mono.sm, { color: colors.textPrimary }]}>
          {amount != null ? formatINR(amount) : '—'}
        </Text>
      ) : (
        <View style={styles.inputWrapper}>
          {method === 'percentage' && (
            <Text style={[text.label.md, { color: colors.textMuted, marginRight: 4 }]}>
              %
            </Text>
          )}
          {method === 'exact' && (
            <Text style={[text.label.md, { color: colors.textMuted, marginRight: 4 }]}>
              ₹
            </Text>
          )}
          <TextInput
            value={value != null && value > 0 ? String(value) : ''}
            onChangeText={(v) => {
              // Convert value to a float or 0
              const clean = v.replace(/[^0-9.]/g, '')
              const num = parseFloat(clean) || 0
              onChangeValue?.(user.uid, num)
            }}
            placeholder={method === 'percentage' ? '0' : '0.00'}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[
              styles.amountInput,
              {
                fontFamily:      fonts.mono,
                fontSize:        14,
                color:           colors.textPrimary,
                backgroundColor: colors.bgSecondary,
                borderColor:     colors.border,
                borderWidth:     1,
                borderRadius:    radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical:   spacing.xs,
                minWidth:          80,
                textAlign:         'right',
                minHeight:         36,
              },
            ]}
            accessibilityLabel={`${user.name.split(' ')[0]} share`}
          />
        </View>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  amountInput:  {},
})
