// src/screens/itinerary/ItineraryMapScreen.tsx
// Full-screen Mapbox map — the trip overview.
//
// LAYOUT (all absolute positioned — true full-screen):
//   MapboxGL.MapView (full screen, edge-to-edge)
//     └── Camera (fitBounds to visible pins)
//     └── RoutePolyline (per day)
//     └── MapItemPin[] (per item with placeRef)
//   DayFilterBar (top overlay, floats over map)
//   MapCallout (above active pin — absolute)
//   MapFAB "List view" (bottom-right)
//   ItemDetailSheet (for "View details" from callout)
//
// STATE:
//   activeFilter:  DayFilter ('all' or 'YYYY-MM-DD')
//   activeItem:    ItineraryItem | null  — item whose callout is open
//   activeItemScreenX: number  — X position for callout positioning
//
// CAMERA BEHAVIOUR:
//   On filter change → fitBounds to all visible pins (with 60dp padding)
//   On pin tap → camera.moveTo(pin coordinate) with 200ms animation
//   Initial → fitBounds to all trip pins on mount
//
// MAPBOX NOTE:
//   camera.fitBounds(ne, sw, padding, duration) — northeast + southwest corners
//   Compute bounds from visible items' lat/lng values.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Dimensions,
  StyleSheet,
} from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets }      from 'react-native-safe-area-context'
import { useNavigation }          from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ItineraryStackParamList } from '../../navigation/types'
import { useTheme }               from '../../theme'
import { useItinerary }           from '../../hooks/useItinerary'
import { useGroupStore }          from '../../stores/group.store'
import { useGroupMembers }        from '../../hooks/useGroupMembers'
import { DayFilterBar, type DayFilter } from './DayFilterBar'
import { RoutePolyline }          from './RoutePolyline'
import { MapItemPin }             from './MapItemPin'
import { MapCallout }             from './MapCallout'
import { MapFAB }                 from './MapFAB'
import {
  ItemDetailSheet,
  type ItemDetailSheetRef,
} from './ItemDetailSheet'
import type { ItineraryItem }     from '../../lib/schemas'

const SCREEN_WIDTH = Dimensions.get('window').width

// Initialize Mapbox token
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '')

// Compute bounding box from items with coordinates
function getBounds(items: ItineraryItem[]): {
  ne: [number, number]  // [lng, lat]
  sw: [number, number]  // [lng, lat]
} | null {
  const pts = items.filter(i => i.placeRef?.lat && i.placeRef?.lng)
  if (pts.length === 0) return null

  const lats = pts.map(i => i.placeRef!.lat)
  const lngs = pts.map(i => i.placeRef!.lng)

  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
  }
}

export function ItineraryMapScreen() {
  const { spacing, mapStyle, layout } = useTheme()
  const navigation       = useNavigation<NativeStackNavigationProp<ItineraryStackParamList>>()
  const insets           = useSafeAreaInsets()
  const activeGroup      = useGroupStore(s => s.activeGroup)
  const cameraRef        = useRef<MapboxGL.Camera>(null)
  const detailSheetRef   = useRef<ItemDetailSheetRef>(null)

  const {
    itemsByDay,
    tripDateRange,
    myUid,
    updateItem,
    deleteItem,
    moveItem,
    vote,
  } = useItinerary(activeGroup?.id ?? null)

  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const [activeFilter, setActiveFilter] = useState<DayFilter>('all')
  const [activeItem,   setActiveItem]   = useState<ItineraryItem | null>(null)
  const [calloutX,     setCalloutX]     = useState(SCREEN_WIDTH / 2)

  // ── Derived data ──────────────────────────────────────────────────

  // All items across all days — flattened
  const allItems = useMemo(
    () => Object.values(itemsByDay).flat(),
    [itemsByDay],
  )

  // Items visible under current filter
  const visibleItems = useMemo((): ItineraryItem[] => {
    if (activeFilter === 'all') return allItems
    return itemsByDay[activeFilter] ?? []
  }, [activeFilter, allItems, itemsByDay])

  // Items per day for polyline (sorted by sortOrder)
  const itemsPerDay = useMemo(
    () => Object.fromEntries(
      Object.entries(itemsByDay).map(([dayId, items]) => [
        dayId,
        [...items]
          .filter(i => i.placeRef?.lat && i.placeRef?.lng)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      ])
    ),
    [itemsByDay],
  )

  // Item counts for DayFilterBar dots
  const itemCounts = useMemo(
    () => Object.fromEntries(
      Object.entries(itemsByDay).map(([dayId, items]) => [dayId, items.length])
    ),
    [itemsByDay],
  )

  // Member names for ItemDetailSheet
  const memberNames = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach((user, uid) => {
      map[uid] = user.name || 'Someone'
    })
    return map
  }, [members])

  // ── Camera: fit bounds to visible pins ───────────────────────────

  const fitBoundsToItems = useCallback((items: ItineraryItem[], animated = true) => {
    const bounds = getBounds(items)
    if (!bounds) return

    // If single point — moveTo instead of fitBounds
    const { ne, sw } = bounds
    if (ne[0] === sw[0] && ne[1] === sw[1]) {
      cameraRef.current?.setCamera({
        centerCoordinate: ne,
        zoomLevel:        14,
        animationDuration: animated ? 600 : 0,
      })
      return
    }

    cameraRef.current?.fitBounds(ne, sw, [80, 60, 60, 60], animated ? 600 : 0)
  }, [])

  // Fit on mount
  useEffect(() => {
    if (allItems.length > 0) {
      // Slight delay — camera must be ready after mount
      const timer = setTimeout(() => fitBoundsToItems(allItems, false), 300)
      return () => clearTimeout(timer)
    }
  }, [allItems, fitBoundsToItems])

  // Fit on filter change
  useEffect(() => {
    fitBoundsToItems(visibleItems)
  }, [activeFilter, visibleItems, fitBoundsToItems])

  // ── Pin tap → callout ─────────────────────────────────────────────

  const handlePinPress = useCallback((item: ItineraryItem) => {
    setActiveItem(prev => prev?.id === item.id ? null : item)
    // Move camera to pin
    if (item.placeRef?.lat && item.placeRef?.lng) {
      cameraRef.current?.setCamera({
        centerCoordinate: [item.placeRef.lng, item.placeRef.lat],
        zoomLevel:        15,
        animationDuration: 400,
      })
    }
    // Approximate screen X — center for now
    setCalloutX(SCREEN_WIDTH / 2)
  }, [])

  const handleDismissCallout = useCallback(() => setActiveItem(null), [])

  const handleViewDetails = useCallback((item: ItineraryItem) => {
    setActiveItem(null)
    detailSheetRef.current?.open(item)
  }, [])

  // ── Day filter ────────────────────────────────────────────────────

  const handleFilterSelect = useCallback((filter: DayFilter) => {
    setActiveFilter(filter)
    setActiveItem(null)  // Dismiss callout on filter change
  }, [])

  // ── Navigation ────────────────────────────────────────────────────

  function handleListView() {
    navigation.goBack()
  }

  // ── Polyline days to render ───────────────────────────────────────
  const polylineDays = activeFilter === 'all'
    ? tripDateRange
    : [activeFilter]

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      {/* Full-screen map — no header, edge-to-edge */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleJSON={JSON.stringify({ version: 8, layers: mapStyle as any })}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        compassViewPosition={3}  // Bottom-left
        compassViewMargins={{
          x: spacing.lg,
          y: layout.tabBarHeight + insets.bottom + spacing.xl + 56,
        }}
        onPress={handleDismissCallout}  // Tap map to dismiss callout
      >
        <MapboxGL.Camera ref={cameraRef} />

        {/* Route polylines — one per visible day */}
        {polylineDays.map(dayId => {
          const dayItems = itemsPerDay[dayId] ?? []
          const coords   = dayItems.map(
            (i): [number, number] => [i.placeRef!.lng, i.placeRef!.lat]
          )
          return (
            <RoutePolyline
              key={dayId}
              coordinates={coords}
              dayId={dayId}
            />
          )
        })}

        {/* Item pins */}
        {visibleItems.map((item, index) => {
          const orderNum = activeFilter !== 'all'
            ? index + 1
            : undefined
          return (
            <MapItemPin
              key={item.id}
              item={item}
              orderNumber={orderNum}
              isActive={activeItem?.id === item.id}
              onPress={handlePinPress}
            />
          )
        })}
      </MapboxGL.MapView>

      {/* Floating day filter bar */}
      <DayFilterBar
        dates={tripDateRange}
        activeFilter={activeFilter}
        onSelect={handleFilterSelect}
        itemCounts={itemCounts}
      />

      {/* Callout — outside MapView for correct z-index */}
      {activeItem && (
        <MapCallout
          item={activeItem}
          screenX={calloutX}
          screenWidth={SCREEN_WIDTH}
          onViewDetails={handleViewDetails}
          onDismiss={handleDismissCallout}
        />
      )}

      {/* List view FAB */}
      <MapFAB variant="list" onPress={handleListView} />

      {/* Item detail sheet */}
      <ItemDetailSheet
        ref={detailSheetRef}
        groupId={activeGroup?.id ?? ''}
        myUid={myUid || ''}
        memberNames={memberNames}
        tripDates={tripDateRange}
        onUpdate={async (itemId, updates) => {
          const item = allItems.find(i => i.id === itemId)
          if (!item || !activeGroup?.id) return
          await updateItem(activeGroup.id, item.dayId, itemId, updates)
        }}
        onDelete={async (itemId) => {
          const item = allItems.find(i => i.id === itemId)
          if (!item || !activeGroup?.id) return
          await deleteItem(activeGroup.id, item.dayId, itemId)
        }}
        onMove={async (item, targetDayId) => {
          if (!activeGroup?.id) return
          const targetItems = itemsByDay[targetDayId] ?? []
          await moveItem(activeGroup.id, item.dayId, targetDayId, item, targetItems.length)
        }}
        onVote={async (itemId, v) => {
          const item = allItems.find(i => i.id === itemId)
          if (!item || !activeGroup?.id || !myUid) return
          await vote(activeGroup.id, item.dayId, itemId, myUid, v)
        }}
      />
    </GestureHandlerRootView>
  )
}
