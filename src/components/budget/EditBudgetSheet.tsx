// src/components/budget/EditBudgetSheet.tsx
import { useState, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { useTheme } from '@theme'
import { BottomSheet } from '@components/ui/BottomSheet'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'

interface EditBudgetSheetProps {
  visible: boolean
  initialValue: string
  currency?: string
  canRemove?: boolean
  isSaving?: boolean
  onClose: () => void
  onSubmit: (value: string | null) => void
}

export function EditBudgetSheet({
  visible,
  initialValue,
  currency: _currency = 'INR',
  canRemove = false,
  isSaving = false,
  onClose,
  onSubmit,
}: EditBudgetSheetProps) {
  const { spacing } = useTheme()
  const [amountStr, setAmountStr] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setAmountStr(initialValue)
      setError(null)
    }
  }, [visible, initialValue])

  const handleSave = useCallback(() => {
    setError(null)
    const cleaned = amountStr.trim()
    if (!cleaned) {
      setError('Please enter a budget amount.')
      return
    }
    const parsedAmount = parseFloat(cleaned)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive budget amount.')
      return
    }
    onSubmit(String(parsedAmount))
  }, [amountStr, onSubmit])

  const handleRemove = useCallback(() => {
    onSubmit(null)
  }, [onSubmit])

  const title = initialValue ? 'Edit trip budget' : 'Set trip budget'

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapHeight={390}
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg }}>
        <Input
          label="Trip Budget"
          placeholder="e.g. 50000"
          type="amount"
          value={amountStr}
          onChangeText={setAmountStr}
          error={error ?? undefined}
          disabled={isSaving}
          hint="This is the total group budget for the trip."
        />

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={isSaving ? 'Saving...' : 'Save budget'}
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
          />
          {canRemove && (
            <Button
              label={isSaving ? 'Removing...' : 'Remove budget'}
              variant="danger"
              onPress={handleRemove}
              loading={isSaving}
              disabled={isSaving}
            />
          )}
        </View>
      </View>
    </BottomSheet>
  )
}
