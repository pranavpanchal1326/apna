// src/screens/map/MapScreen.tsx
// Full-featured edge-to-edge Mapbox screen supporting live tracking, itinerary pins, route overlays, and check-ins.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native'
import { Map as MapLibreMap, Camera, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { AppState, type AppStateStatus } from 'react-native'
import { haptics } from '@lib/haptics'
import { Ghost, Crosshair, MapPin } from 'phosphor-react-native'
import type { MemberLocation } from '../../lib/types/location.types'

import { useTheme } from '../../theme'
import { useGroupStore } from '../../stores/group.store'
import { useItinerary } from '../../hooks/useItinerary'
import { useItineraryStore } from '../../stores/itinerary.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { useGroupLocations } from '../../hooks/useRealtime'
import { useAuth } from '../../hooks/useAuth'
import { useLocationStore } from '../../stores/location.store'
import { searchPlaces, type PlaceSearchResult } from '../../lib/places/placeSearch'
import { triggerSOSEvent } from '../../lib/firebase/realtime'

import { ItineraryPins } from './components/ItineraryPins'
import { LiveMemberPins } from './components/LiveMemberPins'
import { RouteOverlay } from './components/RouteOverlay'
import { PlaceDetailsSheet, PlaceDetailsSheetRef, SelectedPin } from './components/PlaceDetailsSheet'
import { MapFAB } from '../itinerary/MapFAB'
import { DayFilterBar, type DayFilter } from '../itinerary/DayFilterBar'
import { PrivacyQuickSheet } from './components/PrivacyQuickSheet'
import { LocationSharingBanner } from '@components'

import {
  normalizeItineraryPins,
  buildRouteSegments,
  deriveNextStop,
  calculateDistanceKm,
} from '../../lib/utils/mapNormalize'
import { createCheckIn } from '../../lib/firebase/checkin'
import type { ItineraryItem, PlaceRef } from '../../lib/schemas'

export function MapScreen() {
  const { colors, spacing, radius, text, mapStyle, shadows, layout } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  // 1. Group, Auth, & Member hooks
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const groupId = activeGroup?.id ?? null
  const { user } = useAuth()
  const myUid = user?.uid ?? ''
  const myName = user?.name ?? 'Someone'

  const {
    itemsByDay,
    tripDateRange,
    addItem,
  } = useItinerary(groupId)

  const memberIds = activeGroup?.memberIds ?? []
  const { members } = useGroupMembers(memberIds)
  const liveLocations = useGroupLocations(groupId, members, myUid)

  // Location Privacy Store
  const {
    isSharing,
    isGhostMode,
    sessionExpiryTime,
    checkExpiry,
    toggleGhostMode,
  } = useLocationStore()

  // Local UI states
  const [privacySheetVisible, setPrivacySheetVisible] = useState(false)
  const [isSendingSOS, setIsSendingSOS] = useState(false)

  // 2. Map & Camera State
  const cameraRef = useRef<CameraRef>(null)
  const detailSheetRef = useRef<PlaceDetailsSheetRef>(null)

  const [activeFilter, setActiveFilter] = useState<DayFilter>('all')
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)

  // 3. Legend & UI State
  const [showLegend, setShowLegend] = useState(false)
  const [showCheckInSearch, setShowCheckInSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // ── Subscriptions for all days ─────────────────────────────────────
  // Ensure we load and watch itinerary items for all days of the trip
  const store = useItineraryStore()
  useEffect(() => {
    if (!groupId || tripDateRange.length === 0) return
    tripDateRange.forEach((dayId) => {
      store.subscribeToDay(groupId, dayId)
    })
  }, [groupId, tripDateRange])

  // ── GPS Acquisition + live updates ────────────────────────────────
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null
    let cancelled = false

    async function requestLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (cancelled) return
        setPermissionStatus(status)
        if (status !== 'granted') return

        const loc = await Location.getLastKnownPositionAsync({})
        if (loc && !cancelled) {
          setUserLocation([loc.coords.longitude, loc.coords.latitude])
        }

        // Keep userLocation fresh — powers proximity alerts, recenter, search bias
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
          (update) => {
            setUserLocation([update.coords.longitude, update.coords.latitude])
          },
        )
        if (cancelled) subscription.remove()
      } catch (err) {
        console.warn('[MapScreen] Failed to acquire GPS position:', err)
      }
    }
    requestLocation()

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [])

  // ── Session Expiry AppState Watcher ────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        checkExpiry()
      }
    })
    return () => sub.remove()
  }, [checkExpiry])


  // ── Derived Data for rendering ──────────────────────────────────────
  const allItems = useMemo(() => Object.values(itemsByDay).flat(), [itemsByDay])

  const visibleItems = useMemo((): ItineraryItem[] => {
    if (activeFilter === 'all') return allItems
    return itemsByDay[activeFilter] ?? []
  }, [activeFilter, allItems, itemsByDay])

  const itineraryPins = useMemo(() => normalizeItineraryPins(visibleItems), [visibleItems])
  const memberPinsList = useMemo(() => Array.from(liveLocations.values()), [liveLocations])
  const routeOverlayCoords = useMemo(() => buildRouteSegments(visibleItems), [visibleItems])
  const nextStop = useMemo(() => deriveNextStop(allItems, myUid), [allItems, myUid])

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(itemsByDay).forEach(([dayId, items]) => {
      counts[dayId] = items.length
    })
    return counts
  }, [itemsByDay])

  // ── Proximity Detection ──────────────────────────────────────────────
  const proximityAlertStop = useMemo(() => {
    if (!userLocation || !nextStop?.placeRef?.lat) return null
    const dist = calculateDistanceKm(
      userLocation[1],
      userLocation[0],
      nextStop.placeRef.lat,
      nextStop.placeRef.lng
    )
    return dist <= 0.5 ? nextStop : null // 500 meters threshold
  }, [userLocation, nextStop])

  // ── Camera bounds centering ─────────────────────────────────────────
  const fitCameraToBounds = useCallback(
    (animated = true) => {
      const coordinates: Array<[number, number]> = []

      // Add itinerary stops
      itineraryPins.forEach((pin) => {
        if (pin.placeRef) coordinates.push([pin.placeRef.lng, pin.placeRef.lat])
      })

      // Add live members
      memberPinsList.forEach((m) => {
        coordinates.push([m.lng, m.lat])
      })

      // Add user location
      if (userLocation) {
        coordinates.push(userLocation)
      }

      if (coordinates.length === 0) return

      if (coordinates.length === 1) {
        cameraRef.current?.easeTo({
          center: coordinates[0],
          zoom: 14,
          duration: animated ? 600 : 0,
        })
        return
      }

      const lngs = coordinates.map((c) => c[0])
      const lats = coordinates.map((c) => c[1])

      // LngLatBounds: [west, south, east, north]
      cameraRef.current?.fitBounds(
        [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        {
          padding: { top: 80, right: 60, bottom: 80, left: 60 },
          duration: animated ? 600 : 0,
        },
      )
    },
    [itineraryPins, memberPinsList, userLocation]
  )

  useEffect(() => {
    if (itineraryPins.length > 0 || memberPinsList.length > 0) {
      const timer = setTimeout(() => fitCameraToBounds(false), 400)
      return () => clearTimeout(timer)
    }
  }, [fitCameraToBounds])

  // ── Pin interactions ───────────────────────────────────────────────
  const handlePressItineraryPin = useCallback((item: ItineraryItem) => {
    const selection = { type: 'itinerary' as const, item }
    setSelectedPin(selection)
    detailSheetRef.current?.open(selection)
    if (item.placeRef) {
      cameraRef.current?.easeTo({
        center: [item.placeRef.lng, item.placeRef.lat],
        zoom: 15,
        duration: 400,
      })
    }
  }, [])

  const handlePressMemberPin = useCallback((loc: MemberLocation) => {
    const selection = { type: 'member' as const, location: loc }
    setSelectedPin(selection)
    detailSheetRef.current?.open(selection)
    cameraRef.current?.easeTo({
      center: [loc.lng, loc.lat],
      zoom: 15,
      duration: 400,
    })
  }, [])

  const handleRecenter = () => {
    if (userLocation) {
      cameraRef.current?.easeTo({
        center: userLocation,
        zoom: 15,
        duration: 500,
      })
    } else {
      fitCameraToBounds(true)
    }
  }

  // ── Check-in search fetch (keyless Photon/OSM search) ─────────────
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    setSearchLoading(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed, {
          limit: 6,
          signal: controller.signal,
          proximity: userLocation
            ? { lat: userLocation[1], lng: userLocation[0] }
            : undefined,
        })
        setSearchResults(results)
      } catch (err) {
        // Ignored aborts
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, userLocation])

  // ── Perform Check-in write ──────────────────────────────────────────
  const handlePerformCheckIn = async (selection: SelectedPin, message?: string) => {
    if (!groupId) return

    try {
      if (selection.type === 'itinerary') {
        await createCheckIn({
          groupId,
          userId: myUid,
          userName: myName,
          placeId: selection.item.placeRef?.placeId ?? selection.item.id,
          placeName: selection.item.title,
          dayId: selection.item.dayId,
          itemId: selection.item.id,
          message,
        })
      } else if (selection.type === 'place') {
        // Create as a new itinerary stop on current date (or Day 1)
        let dayId = new Date().toISOString().split('T')[0]
        if (!tripDateRange.includes(dayId)) {
          dayId = tripDateRange[0] || dayId
        }

        const placeRefPayload: PlaceRef = {
          placeId: selection.place.placeId ?? `custom-${Date.now()}`,
          name: selection.place.name,
          address: selection.place.address,
          lat: selection.place.lat,
          lng: selection.place.lng,
        }

        const newItemId = await addItem(
          groupId,
          dayId,
          {
            title: selection.place.name,
            category: 'custom',
            placeRef: placeRefPayload,
            isConfirmed: true,
            linkedExpenseIds: [],
            votes: { up: [], down: [] },
            sortOrder: 1000,
          },
          myUid
        )

        await createCheckIn({
          groupId,
          userId: myUid,
          userName: myName,
          placeId: placeRefPayload.placeId,
          placeName: selection.place.name,
          dayId,
          itemId: newItemId,
          message,
        })
      }
      Alert.alert('Checked In!', `You have successfully checked in.`)
      setShowCheckInSearch(false)
      setSelectedPin(null)
    } catch (err) {
      Alert.alert('Check-in Failed', 'Could not record check-in. Please try again.')
    }
  }

  // ── Filter recommendation stops ─────────────────────────────────────
  const nearbyStops = useMemo(() => {
    if (!userLocation) return []
    return allItems
      .filter(
        (item) =>
          item.isConfirmed &&
          item.placeRef?.lat !== undefined &&
          !item.completedAt &&
          (!item.checkedInUids || !item.checkedInUids.includes(myUid))
      )
      .map((item) => {
        const dist = calculateDistanceKm(
          userLocation[1],
          userLocation[0],
          item.placeRef!.lat,
          item.placeRef!.lng
        )
        return { item, dist }
      })
      .filter((x) => x.dist <= 5.0) // 5km limit for recommendation
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
  }, [userLocation, allItems, myUid])

  const handleSOSTrigger = () => {
    Alert.alert(
      'Send Emergency SOS?',
      `This will immediately broadcast your current location to all members of ${activeGroup?.name || 'the group'} and send a high-priority push alert.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            haptics.sosPing()
            setIsSendingSOS(true)
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              })
              const coords = {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracy: loc.coords.accuracy ?? 10,
              }
              await triggerSOSEvent(groupId!, myUid, coords)
              Alert.alert('SOS Sent', 'Your location has been sent and group members notified.')
            } catch (err) {
              console.error('[SOS] Failed to send SOS:', err)
              Alert.alert('SOS Failed', 'Failed to acquire location or notify group.')
            } finally {
              setIsSendingSOS(false)
            }
          }
        }
      ]
    )
  }

  if (!groupId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>No active group</Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <View style={StyleSheet.absoluteFill}>
        <LocationSharingBanner />
        {/* edge-to-edge map view */}
        <MapLibreMap
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyle}
          logo={false}
          attribution={false}
          compass
          onPress={() => {
            setSelectedPin(null)
            detailSheetRef.current?.close()
          }}
        >
          <Camera ref={cameraRef} />

          {/* User Blue Dot Location */}
          {permissionStatus === 'granted' && (
            <UserLocation accuracy minDisplacement={5} />
          )}

          {/* Connect stops with thread polyline */}
          <RouteOverlay coordinates={routeOverlayCoords} />

          {/* Planned Stops Pins */}
          <ItineraryPins
            items={itineraryPins}
            activeItemId={selectedPin?.type === 'itinerary' ? selectedPin.item.id : null}
            nextStopId={nextStop?.id ?? null}
            onPressPin={handlePressItineraryPin}
          />

          {/* Friends Live Pins */}
          <LiveMemberPins
            locations={memberPinsList}
            activeMemberId={selectedPin?.type === 'member' ? selectedPin.location.userId : null}
            onPressMember={handlePressMemberPin}
          />
        </MapLibreMap>

        {/* ── LOCATION PRIVACY HEADER ROW ─────────────────────────────── */}
        <View style={[styles.headerRow, { top: insets.top + spacing.sm }]}>
          {(() => {
            let bgColor: string = colors.bgSecondary
            let borderColor: string = colors.hairline
            let textColor: string = colors.textSecondary
            let labelText = 'Location off'
            let hasDot = false
            let isGhost = false

            if (isSharing) {
              if (isGhostMode) {
                bgColor = colors.accentPrimary + '15'
                borderColor = colors.accentPrimary
                textColor = colors.accentPrimary
                labelText = 'Ghost Mode'
                isGhost = true
              } else if (sessionExpiryTime) {
                const remaining = sessionExpiryTime - Date.now()
                const mins = Math.floor(remaining / 60000)
                const hrs = Math.floor(mins / 60)
                const remMins = mins % 60

                if (remaining > 0 && remaining < 5 * 60 * 1000) {
                  bgColor = colors.warning + '15'
                  borderColor = colors.warning
                  textColor = colors.warning
                  labelText = `Expiring in ${remMins}m · Extend`
                } else {
                  bgColor = colors.positive + '15'
                  borderColor = colors.positive
                  textColor = colors.positive
                  labelText = hrs > 0 ? `Sharing · ${hrs}h ${remMins}m left` : `Sharing · ${remMins}m left`
                  hasDot = true
                }
              }
            }

            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPrivacySheetVisible(true)
                }}
                style={[
                  styles.sharingPill,
                  {
                    backgroundColor: bgColor,
                    borderColor,
                    borderRadius: radius.full,
                  },
                ]}
              >
                {hasDot && (
                  <View style={[styles.pulseDot, { backgroundColor: colors.positive, borderRadius: radius.full }]} />
                )}
                {isGhost && <Ghost size={13} color={textColor} style={{ marginRight: 4 }} />}
                <Text style={[text.label.sm, { color: textColor, fontWeight: '700' }]}>
                  {labelText}
                </Text>
              </Pressable>
            )
          })()}
        </View>

        {/* Ghost Mode Persistent Floating Warning Banner */}
        {isSharing && isGhostMode && (
          <View style={[styles.headerRow, { top: insets.top + spacing.sm + 44 }]}>
            <View
              style={[
                styles.ghostBanner,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.accentPrimary,
                  borderRadius: radius.md,
                  ...shadows.card,
                },
              ]}
            >
              <Ghost size={16} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
              <Text style={[text.body.sm, { color: colors.textPrimary, flex: 1 }]}>
                Ghost Mode active — others cannot see you.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  toggleGhostMode()
                }}
                style={{ marginLeft: spacing.sm }}
              >
                <Text style={[text.label.sm, { color: colors.accentPrimary, fontWeight: '700' }]}>
                  TURN OFF
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── FLOAT LAYER 1: Header Contextual Banner ─────────────────────── */}
        <View style={[styles.floatingHeader, { top: insets.top + spacing.sm + (isSharing && isGhostMode ? 104 : 48) }]}>
          {proximityAlertStop ? (
            <Pressable
              onPress={() => handlePressItineraryPin(proximityAlertStop)}
              style={[
                styles.alertBanner,
                { backgroundColor: colors.bgSecondary, borderRadius: radius.md, ...shadows.card },
              ]}
            >
              <View style={styles.nearbyRow}>
                <MapPin size={13} color={colors.positive} weight="fill" />
                <Text style={[text.label.sm, { color: colors.positive }]}>NEARBY STOP</Text>
              </View>
              <Text style={[text.heading.sm, { color: colors.textPrimary, fontSize: 16 }]} numberOfLines={1}>
                You are near {proximityAlertStop.title}!
              </Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                Tap to check in with the squad.
              </Text>
            </Pressable>
          ) : nextStop ? (
            <View
              style={[
                styles.contextBanner,
                { backgroundColor: colors.bgSecondary, borderRadius: radius.md, ...shadows.card },
              ]}
            >
              <Text style={[text.label.sm, { color: colors.accentPrimary }]}>⏭ NEXT STOP</Text>
              <Text style={[text.heading.sm, { color: colors.textPrimary, fontSize: 16 }]} numberOfLines={1}>
                {nextStop.title}
              </Text>
              {nextStop.timeSlot?.startTime && (
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                  Planned: {nextStop.timeSlot.startTime}
                </Text>
              )}
            </View>
          ) : null}
        </View>

        {/* ── FLOAT LAYER 2: Floating Day Filter ──────────────────────────── */}
        <DayFilterBar
          dates={tripDateRange}
          activeFilter={activeFilter}
          onSelect={(filter) => {
            setActiveFilter(filter)
            setSelectedPin(null)
            detailSheetRef.current?.close()
          }}
          itemCounts={itemCounts}
        />

        {/* ── FLOAT LAYER 3: Legend overlay ────────────────────────────────── */}
        <View style={[styles.legendWrapper, { bottom: layout.tabBarHeight + insets.bottom + spacing.lg }]}>
          {showLegend ? (
            <Pressable
              onPress={() => setShowLegend(false)}
              style={[
                styles.legendCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[text.label.md, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                Map Legend
              </Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>Live ({"< 30s ago"})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>Recent (last 5m)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.settled }]} />
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>Offline / Ghost</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accentPrimary }]} />
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>Planned Stop</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.positive, borderRadius: 0 }]} />
                <Text style={[text.label.sm, { color: colors.textSecondary }]}>Completed / Checked In</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setShowLegend(true)}
              style={[
                styles.legendFab,
                { backgroundColor: colors.bgTertiary, borderRadius: radius.full, ...shadows.card },
              ]}
            >
              <Text style={[text.label.sm, { color: colors.accentPrimary }]}>ℹ️ Legend</Text>
            </Pressable>
          )}
        </View>

        {/* ── FLOAT LAYER 4: Navigation & Recenter Controls ────────────────── */}
        <View
          style={[
            styles.rightButtons,
            { bottom: layout.tabBarHeight + insets.bottom + spacing.lg },
          ]}
        >
          {/* Recenter button */}
          <Pressable
            onPress={handleRecenter}
            style={[
              styles.fabBtn,
              { backgroundColor: colors.bgTertiary, borderRadius: radius.full, ...shadows.card },
            ]}
          >
            <Crosshair size={20} color={colors.textPrimary} />
          </Pressable>

          {/* Check-in Search Trigger button */}
          <Pressable
            onPress={() => setShowCheckInSearch(true)}
            style={[
              styles.fabBtn,
              { backgroundColor: colors.accentPrimary, borderRadius: radius.full, ...shadows.card },
            ]}
          >
            <MapPin size={20} color={colors.onAccent} weight="fill" />
          </Pressable>

          {/* SOS button */}
          <Pressable
            delayLongPress={2000}
            onLongPress={handleSOSTrigger}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              Alert.alert(
                'Hold to Trigger SOS',
                'Press and hold this button for 2 seconds to broadcast your live location to all group members.'
              )
            }}
            style={({ pressed }) => [
              styles.fabBtn,
              {
                backgroundColor: colors.negative,
                borderRadius: radius.full,
                opacity: pressed || isSendingSOS ? 0.8 : 1,
              },
              shadows.card,
            ]}
          >
            <Text style={{ fontSize: 20 }}>🆘</Text>
          </Pressable>
        </View>

        <MapFAB variant="list" onPress={() => navigation.goBack()} />

        {/* ── Place Details bottom drawer ───────────────────────────────── */}
        <PlaceDetailsSheet
          ref={detailSheetRef}
          onCheckIn={handlePerformCheckIn}
        />

        {/* ── CHECK-IN SEARCH LIST MODAL ──────────────────────────────────── */}
        {showCheckInSearch && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, zIndex: 100 }]}>
            <View style={[styles.searchContainer, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
              {/* Header */}
              <View style={styles.searchHeader}>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Check In</Text>
                <Pressable
                  onPress={() => {
                    setShowCheckInSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  style={[styles.closeBtn, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}
                >
                  <Text style={[text.label.sm, { color: colors.textPrimary }]}>Close</Text>
                </Pressable>
              </View>

              {/* Autocomplete Input */}
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search places or landmarks..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCorrect={false}
                style={[
                  text.body.md,
                  styles.searchInput,
                  {
                    backgroundColor: colors.bgTertiary,
                    borderColor: colors.hairline,
                    borderRadius: radius.md,
                    color: colors.textPrimary,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              />

              {searchLoading && (
                <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: spacing.md }} />
              )}

              {/* Content lists */}
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={searchQuery.trim().length >= 2 ? searchResults : []}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={() => {
                  if (searchQuery.trim().length >= 2) return null
                  return (
                    <View style={{ gap: spacing.md }}>
                      {nearbyStops.length > 0 && (
                        <View style={{ marginTop: spacing.md }}>
                          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            RECOMMENDED NEARBY STOPS
                          </Text>
                          {nearbyStops.map(({ item, dist }) => (
                            <Pressable
                              key={item.id}
                              onPress={() => {
                                setShowCheckInSearch(false)
                                handlePressItineraryPin(item)
                              }}
                              style={[
                                styles.searchResultRow,
                                { borderBottomColor: colors.hairline, paddingVertical: spacing.md },
                              ]}
                            >
                              <Text style={[text.body.md, { color: colors.textPrimary }]}>
                                {item.title}
                              </Text>
                              <Text style={[text.body.sm, { color: colors.positive, marginTop: 2 }]}>
                                Planned • {dist.toFixed(1)} km away
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )
                }}
                renderItem={({ item }) => {
                  const address = item.address || 'No address provided'

                  return (
                    <Pressable
                      onPress={() => {
                        setShowCheckInSearch(false)
                        const sel = {
                          type: 'place' as const,
                          place: {
                            placeId: item.id,
                            name: item.name,
                            address,
                            lat: item.lat,
                            lng: item.lng,
                          },
                        }
                        setSelectedPin(sel)
                        detailSheetRef.current?.open(sel)
                      }}
                      style={[
                        styles.searchResultRow,
                        { borderBottomColor: colors.hairline, paddingVertical: spacing.md },
                      ]}
                    >
                      <Text style={[text.body.md, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        {address}
                      </Text>
                    </Pressable>
                  )
                }}
              />
            </View>
          </View>
        )}

        <PrivacyQuickSheet
          visible={privacySheetVisible}
          onClose={() => setPrivacySheetVisible(false)}
          groupId={groupId}
        />
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  contextBanner: {
    width: '100%',
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  alertBanner: {
    width: '100%',
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(217,106,80,1)',
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightButtons: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    gap: 12,
  },
  fabBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  legendWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
  },
  legendFab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCard: {
    width: 170,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  searchContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    borderWidth: 1,
    height: 46,
    marginBottom: 12,
  },
  searchResultRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    marginRight: 6,
  },
  ghostBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    width: '100%',
    padding: 10,
    marginTop: 8,
  },
})
