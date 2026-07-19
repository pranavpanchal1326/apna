// src/screens/itinerary/PlaceSearchTab.tsx
// Keyless place search tab inside AddItemSheet (Photon/OSM via lib/places).

import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme'
import type { PlaceRef, ItineraryCategory } from '../../lib/schemas'
import { searchPlaces, inferItineraryCategory, type PlaceSearchResult } from '../../lib/places/placeSearch'

interface PlaceSearchTabProps {
  onPlaceSelected: (placeRef: PlaceRef, category: ItineraryCategory) => void
}

type SearchState =
  | { status: 'idle'; results: PlaceSearchResult[] }
  | { status: 'loading'; results: PlaceSearchResult[] }
  | { status: 'error'; results: PlaceSearchResult[] }

export function PlaceSearchTab({ onPlaceSelected }: PlaceSearchTabProps) {
  const { colors, text, spacing, radius } = useTheme()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle', results: [] })

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setState({ status: 'idle', results: [] })
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setState((current) => ({ status: 'loading', results: current.results }))
      try {
        const results = await searchPlaces(trimmed, { limit: 8, signal: controller.signal })
        setState({ status: 'idle', results })
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
  }, [query])

  function selectResult(result: PlaceSearchResult) {
    const placeRef: PlaceRef = {
      placeId: result.id,
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
      types: result.labels,
    }

    onPlaceSelected(placeRef, inferItineraryCategory(result.labels))
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
            borderColor: colors.hairline,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
        accessibilityLabel="Search places"
      />
      {state.status === 'loading' && (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: spacing.md }} />
      )}
      {state.status === 'error' && (
        <Text style={[text.body.sm, { color: colors.negative, marginTop: spacing.md }]}>
          Could not load places. Try again.
        </Text>
      )}
      <FlatList
        data={state.results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectResult(item)}
            style={[
              styles.resultRow,
              {
                borderBottomColor: colors.hairline,
                paddingVertical: spacing.md,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
          >
            <Text style={[text.body.md, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.address ? (
              <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                {item.address}
              </Text>
            ) : null}
          </Pressable>
        )}
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
