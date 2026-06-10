// src/screens/expense/components/ReceiptChip.tsx
// Small chip showing receipt attachment status.
// Displays thumbnail preview or loading spinner during background upload.

import { StyleSheet, View, Text, Pressable, Image, ActivityIndicator } from 'react-native'
import { useTheme } from '@theme'
import { useExpenseStore } from '@stores/expense.store'

interface ReceiptChipProps {
  expenseId: string
  receiptUrl?: string
  onPress: () => void
  style?: any
}

export function ReceiptChip({ expenseId, receiptUrl, onPress, style }: ReceiptChipProps) {
  const { colors, text, spacing, radius } = useTheme()

  // Grab live upload progress state from the store
  const uploadState = useExpenseStore((s) =>
    s.receiptUploads.find((u) => u.expenseId === expenseId)
  )

  const isUploading = uploadState?.status === 'uploading'
  const isError = uploadState?.status === 'error'

  // If there's no receipt and no upload in progress, render nothing
  if (!receiptUrl && !isUploading && !isError) {
    return null
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isUploading}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: isError ? colors.accentDanger : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="View receipt photo"
    >
      {isUploading ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.accentPrimary} style={styles.spinner} />
          <Text style={[text.label.sm, { color: colors.textSecondary }]}>
            Uploading {uploadState.percent}%
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.row}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={[text.label.sm, { color: colors.accentDanger }]}>
            Upload failed
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          {receiptUrl ? (
            <Image
              source={{ uri: receiptUrl }}
              style={[styles.thumbnail, { borderRadius: radius.sm }]}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.icon}>🧾</Text>
          )}
          <Text style={[text.label.sm, { color: colors.textPrimary, marginLeft: spacing.xs }]}>
            Receipt
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 18,
    height: 18,
  },
  spinner: {
    marginRight: 6,
    transform: [{ scale: 0.8 }],
  },
  icon: {
    fontSize: 12,
  },
})
