// src/screens/budget/components/ExportSheet.tsx
// Chooser sheet for exporting expenses to PDF or CSV formats.
// Displays progress spinner, handles sharing, and cleans up temp files.

import { useState } from 'react'
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native'
import * as Sharing from 'expo-sharing'
import { useTheme } from '@theme'
import { BottomSheet } from '@components/ui/BottomSheet'
import { buildExpenseExportData } from '@lib/utils/exportData'
import { generateExpensesCsv } from '@lib/utils/exportCsv'
import { generateExpensesPdf } from '@lib/utils/exportPdf'
import { writeCsvToCache, copyPdfToCache, cleanStaleExports } from '@lib/utils/exportFileCache'
import type { GroupInput, UserInput, ExpenseInput } from '@lib/schemas'

interface ExportSheetProps {
  visible: boolean
  onClose: () => void
  group: GroupInput
  members: Map<string, UserInput> | UserInput[]
  expenses: ExpenseInput[]
}

export function ExportSheet({
  visible,
  onClose,
  group,
  members,
  expenses,
}: ExportSheetProps) {
  const { colors, text, spacing, radius } = useTheme()
  const [loadingType, setLoadingType] = useState<'pdf' | 'csv' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (type: 'pdf' | 'csv') => {
    setLoadingType(type)
    setError(null)
    try {
      // 1. Compile export data bundle
      const dataBundle = buildExpenseExportData({ group, members, expenses })

      let fileUri = ''
      let filename = ''

      if (type === 'csv') {
        const csvContent = generateExpensesCsv(dataBundle.expenses)
        filename = `${group.name.replace(/\s+/g, '_')}_Expenses_${Date.now()}.csv`
        fileUri = await writeCsvToCache(filename, csvContent)
      } else {
        const tempPdfUri = await generateExpensesPdf(dataBundle)
        filename = `${group.name.replace(/\s+/g, '_')}_Expense_Report_${Date.now()}.pdf`
        fileUri = await copyPdfToCache(tempPdfUri, filename)
      }

      // 2. Trigger native sharing
      const isSharingAvailable = await Sharing.isAvailableAsync()
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: type === 'csv' ? 'text/csv' : 'application/pdf',
          dialogTitle: `Share ${type === 'csv' ? 'CSV' : 'PDF'} Report`,
        })
      } else {
        throw new Error('Native sharing is not supported on this device.')
      }

      // 3. Clear stale cache sweeps in background
      cleanStaleExports()
      onClose()
    } catch (err: any) {
      console.error(`[ExportSheet] ${type} export failed:`, err)
      setError(err?.message || `Failed to export ${type.toUpperCase()}.`)
    } finally {
      setLoadingType(null)
    }
  }

  const isBusy = loadingType !== null

  return (
    <BottomSheet
      visible={visible}
      onClose={isBusy ? () => {} : onClose}
      title="Export Expenses"
      disableBackdropClose={isBusy}
    >
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* PDF Option */}
        <Pressable
          onPress={() => handleExport('pdf')}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.optionBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed || isBusy ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.optionLeft}>
            <Text style={{ fontSize: 24, marginRight: spacing.md }}>📄</Text>
            <View>
              <Text style={[text.label.lg, { color: colors.textPrimary }]}>Export PDF Report</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                Pretty summary with settlements
              </Text>
            </View>
          </View>
          {loadingType === 'pdf' ? (
            <ActivityIndicator size="small" color={colors.accentPrimary} />
          ) : (
            <Text style={{ color: colors.textMuted }}>&rarr;</Text>
          )}
        </Pressable>

        {/* CSV Option */}
        <Pressable
          onPress={() => handleExport('csv')}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.optionBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed || isBusy ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.optionLeft}>
            <Text style={{ fontSize: 24, marginRight: spacing.md }}>📊</Text>
            <View>
              <Text style={[text.label.lg, { color: colors.textPrimary }]}>Export CSV</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                Raw data for Sheets or Excel
              </Text>
            </View>
          </View>
          {loadingType === 'csv' ? (
            <ActivityIndicator size="small" color={colors.accentPrimary} />
          ) : (
            <Text style={{ color: colors.textMuted }}>&rarr;</Text>
          )}
        </Pressable>

        {/* Error message */}
        {error && (
          <Text style={[text.body.sm, { color: colors.accentDanger, marginTop: spacing.xs, textAlign: 'center' }]}>
            ⚠️ {error}
          </Text>
        )}

        {/* Cancel button */}
        <Pressable
          onPress={onClose}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.cancelBtn,
            {
              borderRadius: radius.md,
              borderColor: colors.border,
              padding: spacing.md,
              opacity: pressed || isBusy ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[text.label.md, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
})
