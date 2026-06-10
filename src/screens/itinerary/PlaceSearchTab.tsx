// src/screens/itinerary/PlaceSearchTab.tsx
// Mapbox Geocoding v6 search tab inside AddItemSheet.

import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Constants from 'expo-constants'
import { useTheme } from '../../theme'
import type { PlaceRef, ItineraryCategory } from '../../lib/schemas'

interface PlaceSearchTabProps {
  onPlaceSelected: (placeRef: PlaceRef, category: ItineraryCategory) => void
}

type MapboxFeature = {
  id: string
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    mapbox_id?: string
    name?: string
    full_address?: string
    place_formatted?: string
    feature_type?: string
    poi_category?: string[]
    context?: {
      district?: { name?: string }
      region?: { name?: string }
      place?: { name?: string }
    }
  }
}

type MapboxGeocodeResponse = {
  features?: MapboxFeature[]
}

type SearchState =
  | { status: 'idle'; results: MapboxFeature[] }
  | { status: 'loading'; results: MapboxFeature[] }
  | { status: 'error'; results: MapboxFeature[] }

function getMapboxToken(): string {
  const extra = Constants.expoConfig?.extra as { mapboxToken?: string } | undefined
  return process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? extra?.mapboxToken ?? ''
}

function inferCategory(feature: MapboxFeature): ItineraryCategory {
  const labels = [
    feature.properties.feature_type,
    ...(feature.properties.poi_category ?? []),
  ].map((label) => label?.toLowerCase() ?? '')

  if (labels.some((label) => /restaurant|cafe|food|bar/.test(label))) return 'food'
  if (labels.some((label) => /hotel|lodging|hostel|stay/.test(label))) return 'stay'
  if (labels.some((label) => /airport|station|transit|bus|taxi|transport/.test(label))) return 'transport'
  if (labels.some((label) => /shop|market|mall|store/.test(label))) return 'shopping'
  if (labels.some((label) => /park|trail|activity|adventure|sport/.test(label))) return 'activity'
  return 'attraction'
}

export function PlaceSearchTab({ onPlaceSelected }: PlaceSearchTabProps) {
  const { colors, text, spacing, radius } = useTheme()
  const token = useMemo(getMapboxToken, [])
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle', results: [] })

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2 || !token) {
      setState({ status: 'idle', results: [] })
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setState((current) => ({ status: 'loading', results: current.results }))
      const params = new URLSearchParams({
        q: trimmed,
        access_token: token,
        country: 'in',
        language: 'en',
        limit: '8',
        types: 'poi,address,place,locality,neighborhood',
      })

      try {
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Mapbox search failed: ${response.status}`)
        const json = (await response.json()) as MapboxGeocodeResponse
        setState({ status: 'idle', results: json.features ?? [] })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setState((current) => ({ status: 'error', results: current.results }))
        }
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query, token])

  function selectFeature(feature: MapboxFeature) {
    const [lng, lat] = feature.geometry.coordinates
    const context = feature.properties.context
    const address = feature.properties.full_address
      ?? feature.properties.place_formatted
      ?? [context?.district?.name, context?.region?.name].filter(Boolean).join(', ')

    const placeRef: PlaceRef = {
      placeId: feature.properties.mapbox_id ?? feature.id,
      name: feature.properties.name ?? query.trim(),
      address,
      lat,
      lng,
      types: [
        feature.properties.feature_type,
        ...(feature.properties.poi_category ?? []),
      ].filter((value): value is string => Boolean(value)),
    }

    onPlaceSelected(placeRef, inferCategory(feature))
  }

  return (
    <View style={[styles.container, { padding: spacing.lg }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search a place..."
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        style={[
          text.body.md,
          styles.input,
          {
            backgroundColor: colors.bgTertiary,
            color: colors.textPrimary,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
        accessibilityLabel="Search places"
      />
      {state.status === 'loading' && (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: spacing.md }} />
      )}
      {!token && (
        <Text style={[text.body.sm, { color: colors.accentDanger, marginTop: spacing.md }]}>
          Mapbox token is not configured.
        </Text>
      )}
      {state.status === 'error' && (
        <Text style={[text.body.sm, { color: colors.accentDanger, marginTop: spacing.md }]}>
          Could not load places. Try again.
        </Text>
      )}
      <FlatList
        data={state.results}
        keyExtractor={(item) => item.properties.mapbox_id ?? item.id}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: spacing.sm }}
        renderItem={({ item }) => {
          const context = item.properties.context
          const secondary = item.properties.full_address
            ?? item.properties.place_formatted
            ?? [context?.place?.name, context?.district?.name, context?.region?.name]
              .filter(Boolean)
              .join(', ')

          return (
            <Pressable
              onPress={() => selectFeature(item)}
              style={[
                styles.resultRow,
                {
                  borderBottomColor: colors.border,
                  paddingVertical: spacing.md,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.properties.name ?? 'place'}`}
            >
              <Text style={[text.body.md, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.properties.name ?? 'Unnamed place'}
              </Text>
              {secondary ? (
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                  {secondary}
                </Text>
              ) : null}
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    borderWidth: 1,
    height: 48,
  },
  resultRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
