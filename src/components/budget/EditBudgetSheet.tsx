// src/components/budget/EditBudgetSheet.tsx
import { useState, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { BottomSheet } from '@components/ui/BottomSheet'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { updateGroupBudget } from '@lib/firebase/budget'
import { captureError } from '@lib/sentry'

interface EditBudgetSheetProps {
  visible: boolean
  onClose: () => void
  groupId: string
  currentBudget: number | null
  myUid: string
  onSuccess?: () => void
}

export function EditBudgetSheet({
  visible,
  onClose,
  groupId,
  currentBudget,
  myUid,
  onSuccess,
}: EditBudgetSheetProps) {
  const { spacing } = useTheme()
  const [amountStr, setAmountStr] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill input
  useEffect(() => {
    if (visible) {
      setAmountStr(currentBudget !== null && currentBudget > 0 ? String(currentBudget) : '')
      setError(null)
      setIsSaving(false)
      setIsRemoving(false)
    }
  }, [visible, currentBudget])

  const handleSave = useCallback(async () => {
    setError(null)
    const parsedAmount = parseFloat(amountStr)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive budget amount.')
      return
    }

    setIsSaving(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await updateGroupBudget({
        groupId,
        totalBudget: parsedAmount,
        updatedByUid: myUid,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSuccess?.()
      onClose()
    } catch (err) {
      captureError(err, { source: 'EditBudgetSheet_save', groupId })
      setError(err instanceof Error ? err.message : 'Failed to update budget.')
    } finally {
      setIsSaving(false)
    }
  }, [amountStr, groupId, myUid, onClose, onSuccess])

  const handleRemove = useCallback(async () => {
    setError(null)
    setIsRemoving(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await updateGroupBudget({
        groupId,
        totalBudget: null,
        updatedByUid: myUid,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSuccess?.()
      onClose()
    } catch (err) {
      captureError(err, { source: 'EditBudgetSheet_remove', groupId })
      setError(err instanceof Error ? err.message : 'Failed to remove budget.')
    } finally {
      setIsRemoving(false)
    }
  }, [groupId, myUid, onClose, onSuccess])

  const hasCurrentBudget = currentBudget !== null && currentBudget > 0
  const isLoading = isSaving || isRemoving

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={hasCurrentBudget ? 'Edit budget' : 'Set trip budget'}
      snapHeight={380}
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg }}>
        <Input
          label="Trip Budget"
          placeholder="e.g. 50000"
          type="amount"
          value={amountStr}
          onChangeText={setAmountStr}
          error={error ?? undefined}
          disabled={isLoading}
        />

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={isSaving ? 'Saving...' : 'Save Budget'}
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            disabled={isLoading || !amountStr.trim()}
          />
          {hasCurrentBudget && (
            <Button
              label={isRemoving ? 'Removing...' : 'Remove Budget'}
              variant="danger"
              onPress={handleRemove}
              loading={isRemoving}
              disabled={isLoading}
            />
          )}
        </View>
      </View>
    </BottomSheet>
  )
}
