// src/screens/itinerary/ItineraryScreen.tsx
// Root Screen for Itinerary — integrates DayTabBar, DayPlannerView, AddItemSheet.

import { useRef, useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Screen, FAB } from '../../components'
import { useTheme } from '../../theme'
import { Timestamp } from 'firebase/firestore'
import { useGroupStore } from '../../stores/group.store'
import { useItinerary } from '../../hooks/useItinerary'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { useTripWeather } from '../../hooks/useTripWeather'
import { DayTabBar } from './DayTabBar'
import { DayPlannerView } from './DayPlannerView'
import { AddItemSheet, AddItemSheetRef } from './AddItemSheet'
import { ItemDetailSheet, ItemDetailSheetRef } from './ItemDetailSheet'
import { MapFAB } from './MapFAB'
import { WeatherSummaryCard } from './WeatherSummaryCard'
import type { ItineraryItem, ItineraryItemInput, SmartSuggestion } from '../../lib/schemas'
import type { WeatherDay } from '../../lib/types/weather.types'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ItineraryStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ItineraryStackParamList, 'ItineraryHome'>

export function ItineraryScreen({ route, navigation }: Props) {
  const { colors, text, spacing } = useTheme()
  const activeGroup = useGroupStore(s => s.activeGroup)
  const groupId = route.params?.groupId || activeGroup?.id || null

  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach((user, uid) => {
      map[uid] = user.name || 'Someone'
    })
    return map
  }, [members])

  const {
    dayPlans,
    itemsByDay,
    activeDayId,
    activeDayItems,
    tripDateRange,
    isLoading,
    myUid,
    setActiveDay,
    addItem,
    updateItem,
    deleteItem,
    reorderDay,
    moveItem,
    vote,
  } = useItinerary(groupId)

  const addSheetRef = useRef<AddItemSheetRef>(null)
  const detailSheetRef = useRef<ItemDetailSheetRef>(null)

  // Auto-select first day on mount if none selected
  useEffect(() => {
    if (tripDateRange.length > 0 && !activeDayId) {
      setActiveDay(tripDateRange[0])
    }
  }, [tripDateRange, activeDayId, setActiveDay])

  if (
    !groupId ||
    activeGroup?.status !== 'active' ||
    !activeGroup.startDate ||
    !activeGroup.endDate
  ) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={[text.heading.md, { color: colors.textPrimary }]}>
            No Active Trip
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
            Add trip dates to an active group to unlock the itinerary planner.
          </Text>
        </View>
      </Screen>
    )
  }

  if (isLoading && !activeDayId) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading itinerary...
          </Text>
        </View>
      </Screen>
    )
  }

  // Find the day index for display
  const activeDayIndex = tripDateRange.indexOf(activeDayId || '')
  const dayNumber = activeDayIndex !== -1 ? activeDayIndex + 1 : 1

  // Pre-calculate items count per day for dot indicator
  const itemCounts = dayPlans.reduce((acc, plan) => {
    acc[plan.id] = plan.itemCount || 0
    return acc
  }, {} as Record<string, number>)

  const weatherAnchor = useMemo(() => {
    const allItems = Object.values(itemsByDay).flat()
    const itemWithPlace = allItems.find((item) => item.placeRef)
    if (!itemWithPlace?.placeRef) return null

    return {
      lat: itemWithPlace.placeRef.lat,
      lng: itemWithPlace.placeRef.lng,
      placeName: itemWithPlace.placeRef.name,
    }
  }, [itemsByDay])

  const {
    weather,
    isLoading: isWeatherLoading,
    isRefreshing: isWeatherRefreshing,
    hasStaleCache,
    refreshWeather,
  } = useTripWeather({
    groupId,
    destination: activeGroup?.destination ?? null,
    anchorLocation: weatherAnchor,
  })

  const weatherByDate = useMemo(() => {
    return (weather?.days ?? []).reduce((acc, day) => {
      acc[day.date] = day
      return acc
    }, {} as Record<string, WeatherDay>)
  }, [weather])

  const activeWeatherDay = activeDayId ? weatherByDate[activeDayId] : undefined

  const handleAddStop = async (input: Partial<ItineraryItemInput>, isProposal?: boolean) => {
    if (!activeDayId || !myUid) return
    if (!input.title || !input.category) return

    let proposalMeta = undefined
    let votesValue: any = input.votes ?? { up: [], down: [] }
    
    if (isProposal) {
      votesValue = { [myUid]: 'yes' }
      proposalMeta = {
        proposalId: '',
        proposedBy: myUid,
        proposedAt: Timestamp.fromDate(new Date()),
        state: 'open' as const,
        yesCount: 1,
        maybeCount: 0,
        noCount: 0,
      }
    }

    const payload: any = {
      title: input.title,
      category: input.category,
      sortOrder: input.sortOrder ?? 0,
      placeRef: input.placeRef,
      timeSlot: input.timeSlot,
      duration: input.duration,
      notes: input.notes,
      emoji: input.emoji,
      estimatedCost: input.estimatedCost,
      currency: input.currency,
      imageUrl: input.imageUrl,
      linkedExpenseIds: input.linkedExpenseIds ?? [],
      isConfirmed: isProposal ? false : (input.isConfirmed ?? false),
      votes: votesValue,
      ...(proposalMeta ? { proposalMeta } : {}),
    }

    try {
      await addItem(groupId, activeDayId, payload, myUid)
    } catch (err) {
      Alert.alert('Error', 'Failed to add stop.')
    }
  }

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Stop',
      'Are you sure you want to remove this stop from your itinerary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(groupId, activeDayId!, itemId)
            } catch (err) {
              Alert.alert('Error', 'Failed to delete stop.')
            }
          },
        },
      ]
    )
  }

  const handlePressItem = (item: ItineraryItem) => {
    detailSheetRef.current?.open(item)
  }

  const handleMapView = () => {
    navigation.navigate('ItineraryMap')
  }

  const handleSelectSuggestion = (suggestion: SmartSuggestion) => {
    addSheetRef.current?.open(suggestion)
  }

  return (
    <Screen style={styles.container}>
      {/* Day Selector Tab Bar */}
      <DayTabBar
        dates={tripDateRange}
        dayPlans={dayPlans}
        activeDayId={activeDayId}
        onSelect={setActiveDay}
        itemCounts={itemCounts}
        weatherByDate={weatherByDate}
      />

      <WeatherSummaryCard
        weather={weather}
        activeDay={activeWeatherDay}
        isLoading={isWeatherLoading}
        isRefreshing={isWeatherRefreshing}
        hasStaleCache={hasStaleCache}
        onRefresh={refreshWeather}
      />

      {/* Main Drag-to-Reorder List */}
      <View style={{ flex: 1 }}>
        {activeDayId ? (
          <DayPlannerView
            groupId={groupId}
            dayId={activeDayId}
            dayNumber={dayNumber}
            items={activeDayItems}
            myUid={myUid || ''}
            onReorder={(newOrder) => reorderDay(groupId, activeDayId, newOrder)}
            onVote={(itemId, v) => vote(groupId, activeDayId, itemId, myUid || '', v)}
            onDelete={handleDeleteItem}
            onPressItem={handlePressItem}
            onSelectSuggestion={handleSelectSuggestion}
            onAddFirstStop={() => addSheetRef.current?.open()}
            weatherDay={activeWeatherDay}
          />
        ) : (
          <View style={styles.centered}>
            <Text style={[text.body.md, { color: colors.textSecondary }]}>
              Please select a day.
            </Text>
          </View>
        )}
      </View>

      {/* Floating Buttons: Propose (left) & Add (right) */}
      {activeDayId && (
        <>
          <FAB
            icon={<Text style={{ fontSize: 22, color: colors.bgPrimary, fontWeight: '600' }}>🗳️</Text>}
            onPress={() => addSheetRef.current?.open(undefined, true)}
            accessibilityLabel="Propose activity"
            style={{ position: 'absolute', bottom: spacing.xl, right: spacing.lg + 68 }}
          />
          <FAB
            icon={<Text style={{ fontSize: 24, color: colors.bgPrimary, fontWeight: '600' }}>+</Text>}
            onPress={() => addSheetRef.current?.open(undefined, false)}
            accessibilityLabel="Add stop"
            style={{ position: 'absolute', bottom: spacing.xl, right: spacing.lg }}
          />
        </>
      )}

      {/* Bottom Sheet for adding stops */}
      {activeDayId && (
        <AddItemSheet
          ref={addSheetRef}
          onAdd={handleAddStop}
        />
      )}

      {/* Bottom Sheet for stop details */}
      {activeDayId && (
        <ItemDetailSheet
          ref={detailSheetRef}
          groupId={groupId}
          myUid={myUid || ''}
          memberNames={memberNames}
          tripDates={tripDateRange}
          onUpdate={(itemId, updates) => updateItem(groupId, activeDayId, itemId, updates)}
          onDelete={async (itemId) => {
            try {
              await deleteItem(groupId, activeDayId, itemId)
            } catch (err) {
              Alert.alert('Error', 'Failed to delete stop.')
            }
          }}
          onMove={(item, targetDayId) => {
            const targetItems = itemsByDay[targetDayId] ?? []
            return moveItem(groupId, item.dayId, targetDayId, item, targetItems.length)
          }}
          onVote={(itemId, v) => vote(groupId, activeDayId, itemId, myUid || '', v)}
        />
      )}

      {/* Map Overview FAB */}
      <MapFAB variant="map" onPress={handleMapView} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
})
