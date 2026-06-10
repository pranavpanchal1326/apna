// src/screens/map/components/ItineraryPins.tsx
// Mapbox PointAnnotations for each itinerary item with geographic coordinates.

import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { useTheme } from '../../../theme'
import { CATEGORY_META } from '../../../lib/schemas'
import type { ItineraryItem } from '../../../lib/schemas'

interface ItineraryPinsProps {
  items: ItineraryItem[]
  activeItemId: string | null
  nextStopId: string | null
  onPressPin: (item: ItineraryItem) => void
}

const PIN_SIZE = 36

export const ItineraryPins = memo(function ItineraryPins({
  items,
  activeItemId,
  nextStopId,
  onPressPin,
}: ItineraryPinsProps) {
  const { colors, radius, shadows } = useTheme()

  return (
    <>
      {items.map((item) => {
        if (!item.placeRef?.lat || !item.placeRef?.lng) return null

        const coordinate: [number, number] = [item.placeRef.lng, item.placeRef.lat]
        const isActive = activeItemId === item.id
        const isNext = nextStopId === item.id
        const isCompleted = !!item.completedAt || (item.checkedInUids && item.checkedInUids.length > 0)
        
        const meta = CATEGORY_META[item.category]

        return (
          <MapboxGL.PointAnnotation
            key={item.id}
            id={`itinerary-pin-${item.id}`}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 1 }}
            onSelected={() => onPressPin(item)}
          >
            <View
              style={[
                styles.pinWrapper,
                {
                  opacity: isCompleted ? 0.6 : 1.0,
                },
              ]}
            >
              {/* Outer glow ring for Next Stop */}
              {isNext && (
                <View
                  style={[
                    styles.pulseRing,
                    {
                      borderColor: colors.accentPrimary,
                      borderRadius: (PIN_SIZE + 8) / 2,
                    },
                  ]}
                />
              )}

              {/* Pin circle */}
              <View
                style={[
                  styles.pinCircle,
                  {
                    width: PIN_SIZE,
                    height: PIN_SIZE,
                    borderRadius: radius.full,
                    backgroundColor: colors.bgTertiary,
                    borderColor: isActive
                      ? colors.accentPrimary
                      : isNext
                      ? colors.accentPrimary
                      : colors.border,
                    borderWidth: isActive || isNext ? 2 : 1,
                  },
                  isActive && shadows.accentGlow,
                ]}
              >
                <Text style={styles.pinEmoji} accessibilityLabel={meta?.label}>
                  {item.emoji ?? meta?.emoji ?? '📍'}
                </Text>

                {/* Status dot in bottom right */}
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isCompleted
                        ? colors.positive // Checked-in / Completed
                        : item.isConfirmed
                        ? colors.accentPrimary // Confirmed Planned
                        : colors.accentGold, // Tentative Planned
                      borderColor: colors.bgSecondary,
                    },
                  ]}
                />
              </View>

              {/* Pin tail */}
              <View
                style={[
                  styles.pinTail,
                  {
                    borderTopColor: isActive || isNext ? colors.accentPrimary : colors.border,
                  },
                ]}
              />
            </View>
          </MapboxGL.PointAnnotation>
        )
      })}
    </>
  )
})

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: PIN_SIZE + 8,
    height: PIN_SIZE + 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  pinCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinEmoji: {
    fontSize: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
})
