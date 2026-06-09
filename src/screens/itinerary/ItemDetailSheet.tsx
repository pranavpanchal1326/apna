// src/screens/itinerary/ItemDetailSheet.tsx
// Main sheet displayed when tapping any itinerary stop card.
// Shows header, MapPinView, details body, or edit form.
// Coordinates sub-sheets: LinkExpenseSheet and MoveItemSheet.
//
// SNAP POINTS: ['50%', '92%']

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  ScrollView,
  View,
} from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { useTheme } from '../../theme'
import { ItemDetailHeader }  from './ItemDetailHeader'
import { MapPinView }         from './MapPinView'
import { ItemDetailBody }     from './ItemDetailBody'
import { ItemEditForm }       from './ItemEditForm'
import { LinkExpenseSheet, LinkExpenseSheetRef } from './LinkExpenseSheet'
import { MoveItemSheet, MoveItemSheetRef }       from './MoveItemSheet'
import { ConfirmItemButton }  from './ConfirmItemButton'
import type { ItineraryItem } from '../../lib/schemas'

export interface ItemDetailSheetRef {
  open:  (item: ItineraryItem) => void
  close: () => void
}

interface ItemDetailSheetProps {
  groupId:     string
  myUid:       string
  memberNames: Record<string, string>
  tripDates:   string[]
  onUpdate:    (itemId: string, updates: Partial<ItineraryItem>) => Promise<void>
  onDelete:    (itemId: string) => Promise<void>
  onMove:      (item: ItineraryItem, targetDayId: string) => Promise<void>
  onVote:      (itemId: string, vote: 'up' | 'down') => Promise<void>
}

export const ItemDetailSheet = forwardRef<ItemDetailSheetRef, ItemDetailSheetProps>(
  function ItemDetailSheet({
    groupId,
    myUid,
    memberNames,
    tripDates,
    onUpdate,
    onDelete,
    onMove,
    onVote,
  }, ref) {
    const { colors, spacing } = useTheme()
    const sheetRef        = useRef<BottomSheet>(null)
    const linkExpenseRef  = useRef<LinkExpenseSheetRef>(null)
    const moveItemRef     = useRef<MoveItemSheetRef>(null)
    const snapPoints      = ['50%', '92%']

    const [item, setItem]         = useState<ItineraryItem | null>(null)
    const [editMode, setEditMode] = useState(false)

    useImperativeHandle(ref, () => ({
      open: (itineraryItem) => {
        setItem(itineraryItem)
        setEditMode(false) // reset to view mode on open
        sheetRef.current?.snapToIndex(0)
      },
      close: () => {
        sheetRef.current?.close()
      },
    }))

    if (!item) return null

    const handleConfirm = async () => {
      await onUpdate(item.id, { isConfirmed: true })
      // Keep sheet open but update local item representation to show checkmark
      setItem(prev => prev ? { ...prev, isConfirmed: true } : null)
    }

    const handleSaveEdit = async (updates: Partial<ItineraryItem>) => {
      await onUpdate(item.id, updates)
      setItem(prev => prev ? { ...prev, ...updates } : null)
      setEditMode(false)
    }

    const handleLinkExpensesSave = async (expenseIds: string[]) => {
      await onUpdate(item.id, { linkedExpenseIds: expenseIds })
      setItem(prev => prev ? { ...prev, linkedExpenseIds: expenseIds } : null)
    }

    const handleMoveItemSave = async (targetDayId: string) => {
      await onMove(item, targetDayId)
      sheetRef.current?.close()
    }

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: colors.bgSecondary }}
          handleIndicatorStyle={{ backgroundColor: colors.border, width: 36 }}
        >
          <BottomSheetView style={{ flex: 1 }}>
            {/* Header section */}
            <ItemDetailHeader
              item={item}
              onEdit={() => setEditMode(true)}
              onMove={() => moveItemRef.current?.open(item.dayId, handleMoveItemSave)}
              onDelete={async () => {
                await onDelete(item.id)
                sheetRef.current?.close()
              }}
            />

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Static Mapbox View if stop is linked to a Google Place */}
              {item.placeRef && !editMode && (
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
                  <MapPinView placeRef={item.placeRef} />
                </View>
              )}

              {/* View/Edit form */}
              {editMode ? (
                <ItemEditForm
                  item={item}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditMode(false)}
                />
              ) : (
                <>
                  <ItemDetailBody
                    item={item}
                    myUid={myUid}
                    memberNames={memberNames}
                    onLinkExpenses={() => linkExpenseRef.current?.open(item.linkedExpenseIds, handleLinkExpensesSave)}
                    onVote={(v) => onVote(item.id, v)}
                  />

                  {/* Confirmed CTA at bottom if tentative */}
                  {!item.isConfirmed && (
                    <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
                      <ConfirmItemButton onConfirm={handleConfirm} />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </BottomSheetView>
        </BottomSheet>

        {/* Sub-sheets */}
        <LinkExpenseSheet
          ref={linkExpenseRef}
          groupId={groupId}
        />

        <MoveItemSheet
          ref={moveItemRef}
          dates={tripDates}
        />
      </>
    )
  }
)
