// src/screens/itinerary/LinkExpenseSheet.tsx
// Secondary bottom sheet — lists group expenses for linking to an itinerary item.
// Multi-select: user toggles expenses. Save writes linkedExpenseIds to Firestore.
//
// SHEET SNAP POINTS: ['60%', '90%']
// Expenses listed: all non-deleted group expenses sorted by date desc.
// Already-linked expenses are pre-selected when sheet opens.
// Each row: description + amount + date + checkbox
//
// DATA SOURCE: useExpenseStore (Phase 1) — already loaded for active group.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { useTheme }        from '../../theme'
import { Button }          from '../../components'
import { useExpenseStore } from '../../stores/expense.store'

export interface LinkExpenseSheetRef {
  open:  (currentLinkedIds: string[], onSave: (ids: string[]) => Promise<void>) => void
  close: () => void
}

interface LinkExpenseSheetProps {
  groupId: string
}

export const LinkExpenseSheet = forwardRef<LinkExpenseSheetRef, LinkExpenseSheetProps>(
  function LinkExpenseSheet({ groupId }, ref) {
    const { colors, text, spacing, radius } = useTheme()
    const sheetRef    = useRef<BottomSheet>(null)
    const onSaveRef   = useRef<((ids: string[]) => Promise<void>) | null>(null)
    const snapPoints  = ['60%', '90%']

    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [saving,   setSaving]   = useState(false)

    const expenses = useExpenseStore(s => s.expensesByGroup[groupId] ?? [])

    useImperativeHandle(ref, () => ({
      open: (currentLinkedIds, onSave) => {
        setSelected(new Set(currentLinkedIds))
        onSaveRef.current = onSave
        sheetRef.current?.snapToIndex(0)
      },
      close: () => sheetRef.current?.close(),
    }))

    function toggleExpense(id: string) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }

    async function handleSave() {
      if (!onSaveRef.current || saving) return
      setSaving(true)
      try {
        await onSaveRef.current(Array.from(selected))
        sheetRef.current?.close()
      } finally {
        setSaving(false)
      }
    }

    function formatAmount(paise: number): string {
      return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.bgSecondary }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 36 }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom:     spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection:     'row',
              justifyContent:    'space-between',
              alignItems:        'center',
            }}
          >
            <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
              Link expenses
            </Text>
            <Text style={[text.label.md, { color: colors.textSecondary }]}>
              {selected.size} selected
            </Text>
          </View>

          {/* Expense list */}
          <FlatList
            data={expenses}
            keyExtractor={e => e.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            ListEmptyComponent={
              <Text style={[text.body.md, { color: colors.textMuted, textAlign: 'center', paddingTop: 32 }]}>
                No expenses in this group yet
              </Text>
            }
            renderItem={({ item: expense }) => {
              const isSelected = selected.has(expense.id)
              return (
                <Pressable
                  onPress={() => toggleExpense(expense.id)}
                  style={[
                    styles.expenseRow,
                    {
                      backgroundColor: isSelected
                        ? `${colors.accentPrimary}12`
                        : colors.bgTertiary,
                      borderColor:  isSelected ? colors.accentPrimary : colors.border,
                      borderRadius: radius.md,
                      borderWidth:  1,
                      padding:      spacing.md,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${expense.description}, ${formatAmount(expense.amount)}`}
                >
                  {/* Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor:     isSelected ? colors.accentPrimary : colors.border,
                        backgroundColor: isSelected ? colors.accentPrimary : 'transparent',
                        borderRadius:    4,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Text style={{ color: colors.bgPrimary, fontSize: 12, fontWeight: '700' }}>
                        ✓
                      </Text>
                    )}
                  </View>

                  {/* Expense info */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[text.body.sm, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {expense.description}
                    </Text>
                    <Text style={[text.label.sm, { color: colors.textSecondary }]}>
                      {expense.category} · {new Date((expense.date as any)?.toDate?.() ?? expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>

                  {/* Amount */}
                  <Text style={[text.mono.sm, { color: colors.textPrimary }]}>
                    {formatAmount(expense.amount)}
                  </Text>
                </Pressable>
              )
            }}
          />

          {/* Save button */}
          <View
            style={{
              padding:        spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Button
              variant="primary"
              label={saving ? 'Saving...' : `Save ${selected.size > 0 ? `(${selected.size})` : ''}`}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    )
  }
)

const styles = StyleSheet.create({
  expenseRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  checkbox: {
    width:          20,
    height:         20,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
})
