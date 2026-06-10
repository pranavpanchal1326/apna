// src/screens/map/components/RouteOverlay.tsx
// Mapbox LineLayer rendering a dashed line connecting ordered itinerary stops.

import { useMemo } from 'react'
import MapboxGL from '@rnmapbox/maps'
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
    <MapboxGL.ShapeSource id="route-overlay-source" shape={geojson}>
      <MapboxGL.LineLayer
        id="route-overlay-layer"
        style={{
          lineColor: colors.accentPrimary,
          lineWidth: 2.5,
          lineOpacity: 0.8,
          lineDasharray: [5, 4],    // Dashed thread line (Dhaga style)
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  )
}
