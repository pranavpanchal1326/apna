// src/screens/itinerary/MapCallout.tsx
// Floating preview card that appears above a pin when tapped.
// Rendered as an absolute-positioned View OUTSIDE the MapboxGL.MapView
// (Mapbox PointAnnotation callouts have z-index issues in RN).
//
// POSITION:
//   Calculated from Mapbox camera to screen coordinate conversion.
//   Fallback: centered horizontally, 40% from top.
//   Width: 240dp, centered on pin's X coordinate.
//
// CONTENT:
//   Category emoji + item title + time slot (if any)
//   Place address (if placeRef) — truncated to 1 line
//   Confirmed/Tentative status pill
//   "View details →" button → calls onViewDetails(item)
//   Tap outside → dismiss (handled by parent via onDismiss)
//
// ANIMATION:
//   Fade + translateY(-8) slide up on appear (Animated.parallel, 200ms)
//   No dismiss animation — instant close (callout is ephemeral UI)

import { useEffect, useRef } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTheme }      from '../../theme'
import { CATEGORY_META } from '../../lib/schemas'
import type { ItineraryItem } from '../../lib/schemas'

interface MapCalloutProps {
  item:          ItineraryItem
  screenX:       number    // Screen X coordinate of pin (dp)
  screenWidth:   number    // Device screen width (for edge clamping)
  onViewDetails: (item: ItineraryItem) => void
  onDismiss:     () => void
}

const CALLOUT_WIDTH = 240

export function MapCallout({
  item,
  screenX,
  screenWidth,
  onViewDetails,
  onDismiss,
}: MapCalloutProps) {
  const { colors, text, spacing, radius, shadows } = useTheme()

  // Animation
  const fadeAnim      = useRef(new Animated.Value(0)).current
  const translateAnim = useRef(new Animated.Value(8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue:         1,
        duration:        200,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue:         0,
        duration:        200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [item.id, fadeAnim, translateAnim])  // Re-animate when item changes

  const meta = CATEGORY_META[item.category]

  // Clamp X so callout doesn't overflow screen edges
  const calloutX = Math.max(
    spacing.lg,
    Math.min(screenX - CALLOUT_WIDTH / 2, screenWidth - CALLOUT_WIDTH - spacing.lg)
  )

  return (
    <Animated.View
      style={[
        styles.callout,
        {
          left:            calloutX,
          bottom:          '35%',   // Float above vertical center of map
          width:           CALLOUT_WIDTH,
          backgroundColor: colors.bgSecondary,
          borderColor:     colors.borderAccent,
          borderRadius:    radius.lg,
          borderWidth:     1,
          padding:         spacing.md,
          opacity:         fadeAnim,
          transform:       [{ translateY: translateAnim }],
          ...shadows.elevated,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 20 }} accessibilityLabel={meta.label}>
          {item.emoji ?? meta.emoji}
        </Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[text.body.md, { color: colors.textPrimary, fontWeight: '600' }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.placeRef?.address && (
            <Text
              style={[text.label.sm, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {item.placeRef.address}
            </Text>
          )}
        </View>

        {/* Dismiss X */}
        <Pressable
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>

      {/* Meta row: time + status */}
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        {item.timeSlot && (
          <Text style={[text.mono.sm, { color: colors.textSecondary }]}>
            🕐 {item.timeSlot.startTime}
          </Text>
        )}
        {item.estimatedCost ? (
          <Text style={[text.mono.sm, { color: colors.accentGold }]}>
            ₹{item.estimatedCost.toLocaleString('en-IN')}
          </Text>
        ) : null}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: item.isConfirmed
                ? `${colors.accentPrimary}18`
                : `${colors.accentGold}18`,
              borderColor:  item.isConfirmed ? colors.accentPrimary : colors.accentGold,
              borderRadius: radius.full,
              borderWidth:  1,
              paddingHorizontal: spacing.xs + 2,
              paddingVertical:   1,
            },
          ]}
        >
          <Text
            style={[
              text.label.sm,
              { color: item.isConfirmed ? colors.accentPrimary : colors.accentGold },
            ]}
          >
            {item.isConfirmed ? '✓' : '⏳'}
          </Text>
        </View>
      </View>

      {/* View details button */}
      <Pressable
        onPress={() => onViewDetails(item)}
        style={({ pressed }) => [
          styles.detailsButton,
          {
            backgroundColor: pressed
              ? `${colors.accentPrimary}20`
              : `${colors.accentPrimary}10`,
            borderRadius: radius.sm,
            marginTop:    spacing.sm,
            padding:      spacing.sm,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.title}`}
      >
        <Text
          style={[text.label.md, { color: colors.accentPrimary, textAlign: 'center' }]}
        >
          View details →
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  callout: {
    position: 'absolute',
    zIndex:   30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           8,
  },
  statusPill: {},
  detailsButton: {
    alignItems: 'center',
  },
})
