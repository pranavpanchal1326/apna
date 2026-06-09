// src/screens/itinerary/MoveItemSheet.tsx
// Secondary bottom sheet — lists group trip dates to reschedule/move an item.
//
// SHEET SNAP POINTS: ['50%', '80%']

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
import { useTheme } from '../../theme'
import { Button }    from '../../components'

export interface MoveItemSheetRef {
  open:  (currentDayId: string, onMove: (targetDayId: string) => Promise<void>) => void
  close: () => void
}

interface MoveItemSheetProps {
  dates: string[] // List of YYYY-MM-DD date strings
}

function formatTabDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' })
}

export const MoveItemSheet = forwardRef<MoveItemSheetRef, MoveItemSheetProps>(
  function MoveItemSheet({ dates }, ref) {
    const { colors, text, spacing, radius } = useTheme()
    const sheetRef    = useRef<BottomSheet>(null)
    const onMoveRef   = useRef<((dayId: string) => Promise<void>) | null>(null)
    const snapPoints  = ['50%', '80%']

    const [currentDayId, setCurrentDayId] = useState('')
    const [selectedDayId, setSelectedDayId] = useState('')
    const [moving, setMoving] = useState(false)

    useImperativeHandle(ref, () => ({
      open: (dayId, onMove) => {
        setCurrentDayId(dayId)
        setSelectedDayId(dayId)
        onMoveRef.current = onMove
        sheetRef.current?.snapToIndex(0)
      },
      close: () => sheetRef.current?.close(),
    }))

    async function handleConfirmMove() {
      if (!onMoveRef.current || moving || selectedDayId === currentDayId) return
      setMoving(true)
      try {
        await onMoveRef.current(selectedDayId)
        sheetRef.current?.close()
      } finally {
        setMoving(false)
      }
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
            }}
          >
            <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
              Move stop to another day
            </Text>
          </View>

          {/* List of days */}
          <FlatList
            data={dates}
            keyExtractor={item => item}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            renderItem={({ item: date, index }) => {
              const isCurrent = date === currentDayId
              const isSelected = date === selectedDayId

              return (
                <Pressable
                  onPress={() => setSelectedDayId(date)}
                  style={[
                    styles.dayRow,
                    {
                      backgroundColor: isSelected
                        ? `${colors.accentPrimary}12`
                        : colors.bgTertiary,
                      borderColor:  isSelected ? colors.accentPrimary : colors.border,
                      borderRadius: radius.md,
                      borderWidth:  1,
                      padding:      spacing.md,
                      opacity:      isCurrent ? 0.6 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[text.body.md, { color: colors.textPrimary, fontWeight: isSelected ? '600' : '400' }]}>
                      Day {index + 1}
                    </Text>
                    <Text style={[text.label.sm, { color: colors.textSecondary, marginTop: 2 }]}>
                      {formatTabDate(date)} {isCurrent ? '(Current day)' : ''}
                    </Text>
                  </View>

                  {/* Radio indicator */}
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? colors.accentPrimary : colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: colors.accentPrimary },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              )
            }}
          />

          {/* Footer actions */}
          <View
            style={{
              padding:        spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection:  'row',
              gap:            spacing.md,
            }}
          >
            <Button
              variant="ghost"
              label="Cancel"
              onPress={() => sheetRef.current?.close()}
              style={{ flex: 1 }}
            />
            <Button
              variant="primary"
              label={moving ? 'Moving...' : 'Move'}
              onPress={handleConfirmMove}
              disabled={moving || selectedDayId === currentDayId}
              style={{ flex: 1 }}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    )
  }
)

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  radio: {
    width:        20,
    height:       20,
    borderRadius: 10,
    borderWidth:  2,
  },
  radioInner: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
})
