// src/screens/itinerary/MapPinView.tsx
// Mapbox static map view — single teal marker pin at item's lat/lng.
// Non-interactive (scrollEnabled=false, zoomEnabled=false, pitchEnabled=false).
// Shows the item's location with surrounding context at zoom 14.
//
// DESIGN:
//   Height:       200dp (fixed — from PRD §7 map spec)
//   Border radius: radius.lg (16dp) — matches card radius
//   Marker:        Custom teal pin (SVG inline) centered on placeRef lat/lng
//   Zoom:          14 — shows street-level context without being too zoomed
//   Style:         mapStyle from useTheme() (DarkMapStyle or LightMapStyle)
//
// FALLBACK: if placeRef is null → render a muted placeholder with location emoji
// PERFORMANCE: camera is static — no animation, no pan/zoom

import { useMemo, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { useTheme } from '../../theme'
import type { PlaceRef } from '../../lib/schemas'

// Initialize Mapbox — only once (idempotent)
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '')

interface MapPinViewProps {
  placeRef:    PlaceRef
  height?:     number    // Default 200dp
}

// Teal pin SVG — rendered as Mapbox PointAnnotation child
const MARKER_SIZE = 32

function TealPin() {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.markerOuter,
        {
          width:           MARKER_SIZE,
          height:          MARKER_SIZE,
          borderRadius:    MARKER_SIZE / 2,
          backgroundColor: colors.accentPrimary,
          borderColor:     colors.bgSecondary,
          borderWidth:     2.5,
        },
      ]}
    >
      <View
        style={[
          styles.markerInner,
          { backgroundColor: colors.bgSecondary },
        ]}
      />
      {/* Downward pin tail */}
      <View
        style={[
          styles.markerTail,
          { borderTopColor: colors.accentPrimary },
        ]}
      />
    </View>
  )
}

export function MapPinView({ placeRef, height = 200 }: MapPinViewProps) {
  const { colors, radius, mapStyle } = useTheme()

  const coordinate: [number, number] = useMemo(
    () => [placeRef.lng, placeRef.lat],  // Mapbox: [lng, lat]
    [placeRef.lat, placeRef.lng],
  )

  const cameraRef = useRef<MapboxGL.Camera>(null)

  if (!placeRef.lat || !placeRef.lng) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            height,
            borderRadius:    radius.lg,
            backgroundColor: colors.bgTertiary,
          },
        ]}
      >
        <Text style={{ fontSize: 32 }}>📍</Text>
        <Text style={[{ color: colors.textMuted, marginTop: 8, fontSize: 13 }]}>
          No location data
        </Text>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderRadius: radius.lg,
          overflow:     'hidden',  // Clip map to rounded corners
        },
      ]}
    >
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleJSON={JSON.stringify({ version: 8, layers: mapStyle as any })}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={14}
          centerCoordinate={coordinate}
          animationMode="none"    // Static — no animation
        />

        <MapboxGL.PointAnnotation
          id={`pin-${placeRef.placeId}`}
          coordinate={coordinate}
          anchor={{ x: 0.5, y: 1 }}  // Pin tip at coordinate
        >
          <TealPin />
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>

      {/* Place name overlay — bottom left of map */}
      <View
        style={[
          styles.nameOverlay,
          {
            backgroundColor: colors.overlay,
            borderRadius:    radius.sm,
            padding:         6,
            margin:          8,
          },
        ]}
        pointerEvents="none"
      >
        <Text
          style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '500' }}
          numberOfLines={1}
        >
          {placeRef.name}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  placeholder: {
    width:          '100%',
    alignItems:     'center',
    justifyContent: 'center',
  },
  markerOuter: {
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  markerInner: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  markerTail: {
    position:     'absolute',
    bottom:       -(MARKER_SIZE * 0.35),
    width:        0,
    height:       0,
    borderLeftWidth:   6,
    borderRightWidth:  6,
    borderTopWidth:    10,
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
  },
  nameOverlay: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    maxWidth: '70%',
  },
})
