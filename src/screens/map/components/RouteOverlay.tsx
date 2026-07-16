// src/screens/map/components/RouteOverlay.tsx
// Mapbox LineLayer rendering a dashed line connecting ordered itinerary stops.

import { useMemo } from 'react'
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native'
import { useTheme } from '../../../theme'

interface RouteOverlayProps {
  // Ordered array of [lng, lat] coordinate pairs
  coordinates: Array<[number, number]>
}

export function RouteOverlay({ coordinates }: RouteOverlayProps) {
  const { colors } = useTheme()

  // Need at least 2 points to draw a line
  if (coordinates.length < 2) return null

  // Build GeoJSON LineString
  const geojson = useMemo((): any => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {},
      },
    ],
  }), [coordinates])

  return (
    <GeoJSONSource id="route-overlay-source" data={geojson}>
      <Layer
        id="route-overlay-layer"
        type="line"
        paint={{
          'line-color': colors.accentPrimary,
          'line-width': 2.5,
          'line-opacity': 0.8,
          'line-dasharray': [5, 4],    // Dashed thread line (Dhaga style)
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </GeoJSONSource>
  )
}
