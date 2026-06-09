// src/screens/itinerary/DayPlannerView.tsx
// Renders the DraggableFlatList for itinerary items.
// Includes the ThreadLine overlay, the SuggestionsCarousel at bottom,
// and the EmptyDayState for empty days.

import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useTheme } from '../../theme'
import { ThreadLine } from './ThreadLine'
import { ItineraryItemCard } from './ItineraryItemCard'
import { SuggestionsCarousel } from './SuggestionsCarousel'
import { EmptyDayState } from './EmptyDayState'
import type { ItineraryItem, SmartSuggestion } from '../../lib/schemas'

interface DayPlannerViewProps {
  groupId:      string
  dayId:        string
  dayNumber:    number
  items:        ItineraryItem[]
  myUid:        string
  onReorder:    (newOrder: string[]) => Promise<void>
  onVote:       (itemId: string, vote: 'up' | 'down') => void
  onDelete:     (itemId: string) => void
  onPressItem:  (item: ItineraryItem) => void
  onSelectSuggestion: (suggestion: SmartSuggestion) => void
  onAddFirstStop: () => void
}

export function DayPlannerView({
  groupId,
  dayId,
  dayNumber,
  items,
  myUid,
  onReorder,
  onVote,
  onDelete,
  onPressItem,
  onSelectSuggestion,
  onAddFirstStop,
}: DayPlannerViewProps) {
  const { spacing } = useTheme()
  const [contentHeight, setContentHeight] = useState(0)

  const handleDragStart = () => {
    ReactNativeHapticFeedback.trigger('impactMedium')
  }

  const handleDragEnd = ({ data }: { data: ItineraryItem[] }) => {
    ReactNativeHapticFeedback.trigger('impactLight')
    const ids = data.map(item => item.id)
    onReorder(ids)
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ItineraryItem>) => {
    return (
      <ScaleDecorator>
        <ItineraryItemCard
          item={item}
          drag={drag}
          isActive={isActive}
          myUid={myUid}
          onVote={onVote}
          onDelete={onDelete}
          onPress={onPressItem}
        />
      </ScaleDecorator>
    )
  }

  const hasItems = items.length > 0

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
    >
      {/* Visual Thread line connecting all stops */}
      {hasItems && (
        <ThreadLine
          height={contentHeight - 120} // stop thread line before suggestion carousel
          visible={hasItems}
        />
      )}

      <DraggableFlatList
        data={items}
        onDragBegin={handleDragStart}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: spacing.md,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <EmptyDayState
            dayNumber={dayNumber}
            onAdd={onAddFirstStop}
          />
        }
        ListFooterComponent={
          hasItems ? (
            <SuggestionsCarousel
              groupId={groupId}
              dayId={dayId}
              centerLat={items[items.length - 1]?.placeRef?.lat ?? 26.9124} // Jaipur / fallback center
              centerLng={items[items.length - 1]?.placeRef?.lng ?? 75.7873}
              onSelect={onSelectSuggestion}
            />
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
