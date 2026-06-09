// src/screens/itinerary/MapItemPin.tsx
// Custom Mapbox PointAnnotation for each itinerary item.
//
// PIN DESIGN:
//   Normal:    category emoji in a 36dp circle (bgTertiary bg, border)
//   Active:    same circle but with accentPrimary border (2dp) + accentGlow shadow
//   Confirmed: teal dot in bottom-right corner of circle (8dp)
//   Tentative: gold dot in bottom-right corner (8dp)
//   No place:  hidden (items without placeRef don't get a pin)
//
// ORDER BADGE:
//   Small number badge top-left showing item's position in the day (1-based)
//   Only shown when filter = specific day (not 'all')
//
// PERFORMANCE:
//   PointAnnotation is a React Native View — heavy for 50+ items.
//   Use React.memo on MapItemPin — prevents re-render on unrelated state changes.
//   If item count > 30, switch to SymbolLayer (Prompt 3.x optimization).

import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { useTheme } from '../../theme'
import { CATEGORY_META } from '../../lib/schemas'
import type { ItineraryItem } from '../../lib/schemas'

interface MapItemPinProps {
  item:         ItineraryItem
  orderNumber?: number      // 1-based position in day — shown only for single-day filter
  isActive:     boolean     // True when this item's callout is open
  onPress:      (item: ItineraryItem) => void
}

const PIN_SIZE = 36

export const MapItemPin = memo(function MapItemPin({
  item,
  orderNumber,
  isActive,
  onPress,
}: MapItemPinProps) {
  const { colors, radius, shadows } = useTheme()

  // Skip items without location
  if (!item.placeRef?.lat || !item.placeRef?.lng) return null

  const meta        = CATEGORY_META[item.category]
  const coordinate: [number, number] = [item.placeRef.lng, item.placeRef.lat]

  return (
    <MapboxGL.PointAnnotation
      id={`pin-${item.id}`}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}   // Pin tip at coordinate
      onSelected={() => onPress(item)}
    >
      <View style={styles.pinWrapper}>
        {/* Order badge */}
        {orderNumber !== undefined && (
          <View
            style={[
              styles.orderBadge,
              {
                backgroundColor: colors.accentPrimary,
                borderRadius:    radius.full,
              },
            ]}
          >
            <Text style={styles.orderText}>{orderNumber}</Text>
          </View>
        )}

        {/* Pin circle */}
        <View
          style={[
            styles.pinCircle,
            {
              width:           PIN_SIZE,
              height:          PIN_SIZE,
              borderRadius:    PIN_SIZE / 2,
              backgroundColor: colors.bgTertiary,
              borderColor:     isActive ? colors.accentPrimary : colors.border,
              borderWidth:     isActive ? 2 : 1,
            },
            isActive && shadows.accentGlow,
          ]}
        >
          <Text style={styles.pinEmoji} accessibilityLabel={meta.label}>
            {item.emoji ?? meta.emoji}
          </Text>

          {/* Status dot */}
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: item.isConfirmed
                  ? colors.accentPrimary
                  : colors.accentGold,
                borderColor:     colors.bgSecondary,
              },
            ]}
          />
        </View>

        {/* Pin tail */}
        <View
          style={[
            styles.pinTail,
            {
              borderTopColor: isActive ? colors.accentPrimary : colors.border,
            },
          ]}
        />
      </View>
    </MapboxGL.PointAnnotation>
  )
})

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems:  'center',
    position:    'relative',
  },
  orderBadge: {
    position:       'absolute',
    top:            -6,
    left:           -6,
    width:          18,
    height:         18,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         2,
  },
  orderText: {
    color:      '#080C14',
    fontSize:   10,
    fontWeight: '700',
    lineHeight: 10,
  },
  pinCircle: {
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  pinEmoji: {
    fontSize: 18,
  },
  statusDot: {
    position:     'absolute',
    bottom:       -1,
    right:        -1,
    width:        8,
    height:       8,
    borderRadius: 4,
    borderWidth:  1.5,
  },
  pinTail: {
    width:             0,
    height:            0,
    borderLeftWidth:   5,
    borderRightWidth:  5,
    borderTopWidth:    7,
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
    marginTop:         -1,
  },
})
