// src/screens/itinerary/RoutePolyline.tsx
// Mapbox LineLayer — dashed teal polyline connecting itinerary stops in order.
// Rendered as a Mapbox ShapeSource + LineLayer inside a MapboxGL.MapView.
//
// LINE DESIGN (from PRD §7 map spec):
//   Color:        colors.accentPrimary (#4ECDC4)
//   Width:        2dp
//   Opacity:      0.7
//   Dash pattern: [4, 3] — 4px dash, 3px gap (Dhaga thread visual)
//   Cap:          round
//   Join:         round
//
// INPUT: ordered array of [lng, lat] coordinate pairs (Mapbox order)
// If fewer than 2 points → renders nothing (can't draw a line with 1 point)
//
// GeoJSON LineString — Mapbox renders this natively on the GL thread (60fps)

import { useMemo } from 'react'
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native'
import { useTheme } from '../../theme'

interface RoutePolylineProps {
  // Ordered coordinates: [[lng, lat], [lng, lat], ...]
  // Must be in sortOrder sequence — caller is responsible for sorting
  coordinates: Array<[number, number]>
  dayId:       string   // Used as unique source ID — prevents source conflicts
}

export function RoutePolyline({ coordinates, dayId }: RoutePolylineProps) {
  const { colors } = useTheme()

  // Need at least 2 points to draw a line
  if (coordinates.length < 2) return null

  // Build GeoJSON LineString
  const geojson = useMemo((): any => ({
    type:     'FeatureCollection',
    features: [
      {
        type:     'Feature',
        geometry: {
          type:        'LineString',
          coordinates,
        },
        properties: {},
      },
    ],
  }), [coordinates])

  const sourceId = `route-source-${dayId}`
  const layerId  = `route-layer-${dayId}`

  return (
    <GeoJSONSource id={sourceId} data={geojson}>
      <Layer
        id={layerId}
        type="line"
        paint={{
          'line-color':     colors.accentPrimary,
          'line-width':     2,
          'line-opacity':   0.7,
          'line-dasharray': [4, 3],    // Dashed Dhaga thread
        }}
        layout={{
          'line-cap':  'round',
          'line-join': 'round',
        }}
      />
    </GeoJSONSource>
  )
}
