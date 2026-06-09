// src/screens/itinerary/AddItemSheet.tsx
// Bottom sheet with two tabs: Search (Google Places) + Manual entry.
// Uses @gorhom/bottom-sheet for the sheet mechanics.
// Pre-fills from SmartSuggestion if opened via SuggestionsCarousel tap.
//
// SHEET SNAP POINTS: ['75%', '95%']
// Opens at 75%, expands to 95% when keyboard appears.
// Tab bar at top of sheet: "Search" | "Manual"

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import BottomSheet, {
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useTheme }         from '../../theme'
import { PlaceSearchTab }   from './PlaceSearchTab'
import { ManualItemTab }    from './ManualItemTab'
import type {
  ItineraryItemInput,
  ItineraryCategory,
  PlaceRef,
  SmartSuggestion,
} from '../../lib/schemas'

export interface AddItemSheetRef {
  open:          (prefill?: SmartSuggestion) => void
  close:         () => void
}

interface AddItemSheetProps {
  onAdd:     (input: Partial<ItineraryItemInput>) => Promise<void>
}

type TabId = 'search' | 'manual'

export const AddItemSheet = forwardRef<AddItemSheetRef, AddItemSheetProps>(
  function AddItemSheet({ onAdd }, ref) {
    const { colors, text, spacing, radius } = useTheme()
    const sheetRef    = useRef<BottomSheet>(null)
    const [tab, setTab]     = useState<TabId>('search')
    const [prefill, setPrefill] = useState<SmartSuggestion | undefined>()
    const snapPoints = ['75%', '95%']

    useImperativeHandle(ref, () => ({
      open: (suggestion?: SmartSuggestion) => {
        setPrefill(suggestion)
        if (suggestion) setTab('manual')  // Pre-filled suggestions go to manual tab
        else setTab('search')
        sheetRef.current?.snapToIndex(0)
      },
      close: () => sheetRef.current?.close(),
    }))

    const handlePlaceSelected = useCallback(
      async (placeRef: PlaceRef, category: ItineraryCategory) => {
        await onAdd({
          title:          placeRef.name,
          category,
          placeRef,
          isConfirmed:    false,
          votes:          { up: [], down: [] },
          linkedExpenseIds: [],
        })
        sheetRef.current?.close()
      },
      [onAdd],
    )

    const handleManualSubmit = useCallback(
      async (input: Partial<ItineraryItemInput>) => {
        // Merge prefill placeRef if suggestion was pre-filled
        await onAdd({
          ...input,
          placeRef: prefill?.placeRef ?? undefined,
        })
        sheetRef.current?.close()
      },
      [onAdd, prefill],
    )

    const tabs: Array<{ id: TabId; label: string }> = [
      { id: 'search', label: '🔍  Search' },
      { id: 'manual', label: '✏️  Manual' },
    ]

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
          {/* Sheet header */}
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: spacing.lg,
                paddingBottom:     spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
              Add a stop
            </Text>
          </View>

          {/* Tab switcher */}
          <View
            style={[
              styles.tabRow,
              {
                paddingHorizontal: spacing.lg,
                paddingTop:        spacing.md,
                gap:               spacing.sm,
              },
            ]}
          >
            {tabs.map(t => {
              const isActive = tab === t.id
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: isActive
                        ? `${colors.accentPrimary}18`
                        : colors.bgTertiary,
                      borderColor:   isActive ? colors.accentPrimary : colors.border,
                      borderRadius:  radius.sm,
                      paddingVertical:   spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={t.label}
                >
                  <Text
                    style={[
                      text.label.md,
                      {
                        color: isActive ? colors.accentPrimary : colors.textSecondary,
                        fontWeight: isActive ? '600' : '400',
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Tab Content */}
          <View style={{ flex: 1 }}>
            {tab === 'search' ? (
              <PlaceSearchTab onPlaceSelected={handlePlaceSelected} />
            ) : (
              <ManualItemTab
                onSubmit={handleManualSubmit}
                prefill={
                  prefill
                    ? {
                        title:    prefill.placeRef.name,
                        category: prefill.category,
                        notes:    prefill.reason,
                      }
                    : undefined
                }
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    )
  }
)

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
