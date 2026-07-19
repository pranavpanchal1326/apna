// src/screens/itinerary/DayPlannerView.tsx
// Renders the DraggableFlatList for itinerary items.
// Includes the ThreadLine overlay, the SuggestionsCarousel at bottom,
// and the EmptyDayState for empty days.

import { useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { Warning } from 'phosphor-react-native'
import { useTheme } from '../../theme'
import { ThreadLine } from './ThreadLine'
import { ItineraryItemCard } from './ItineraryItemCard'
import { SuggestionsCarousel } from './SuggestionsCarousel'
import { EmptyDayState } from './EmptyDayState'
import type { ItineraryItem, SmartSuggestion } from '../../lib/schemas'
import type { WeatherDay } from '../../lib/types/weather.types'
import type { BufferWarning } from '../../lib/itinerary/travelTime'

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
  onAiDraft?:    () => void
  isAiDrafting?: boolean
  weatherDay?: WeatherDay
  /** PRD §13 — itemId to travel-time warning for the leg INTO that item. */
  bufferWarnings?: Record<string, BufferWarning>
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
  onAiDraft,
  isAiDrafting,
  weatherDay,
  bufferWarnings,
}: DayPlannerViewProps) {
  const { spacing, colors, text, radius } = useTheme()
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
    const warning = bufferWarnings?.[item.id]
    return (
      <ScaleDecorator>
        {/* Buffer-time warning for the drive INTO this stop (PRD §13) */}
        {warning && !isActive && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
              backgroundColor: `${colors.warning}18`,
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: radius.full,
              paddingHorizontal: spacing.md,
              paddingVertical: 4,
              marginVertical: spacing.xs,
            }}
            accessibilityRole="alert"
            accessibilityLabel={`Tight timing: ${warning.gapMinutes} minute gap but about ${warning.driveMinutes} minutes of driving`}
          >
            <View style={styles.warningRow}>
              <Warning size={13} color={colors.warning} />
              <Text style={[text.label.sm, { color: colors.warning }]}>
                {warning.gapMinutes} min gap — ~{warning.driveMinutes} min drive
              </Text>
            </View>
          </View>
        )}
        <ItineraryItemCard
          item={item}
          drag={drag}
          isActive={isActive}
          myUid={myUid}
          onVote={onVote}
          onDelete={onDelete}
          onPress={onPressItem}
          weatherDay={weatherDay}
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
            onAiDraft={onAiDraft}
            isAiDrafting={isAiDrafting}
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
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  container: {
    flex: 1,
  },
})
