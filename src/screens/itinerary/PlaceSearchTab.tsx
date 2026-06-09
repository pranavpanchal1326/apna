// src/screens/itinerary/PlaceSearchTab.tsx
// Google Places Autocomplete search tab inside AddItemSheet.
// Uses react-native-google-places-autocomplete for the search field.
// On place select → builds PlaceRef snapshot → calls onPlaceSelected(PlaceRef).
//
// API key: stored in app.config.ts as EXPO_PUBLIC_PLACES_API_KEY
// (Different from server key — this is the restricted client key for Autocomplete only)
//
// IMPORTANT: restrict this key in Google Cloud Console to:
//   - Android app + iOS bundle ID
//   - Places API (New) only
//   - No server-side APIs

import { StyleSheet, View } from 'react-native'
import {
  GooglePlacesAutocomplete,
} from 'react-native-google-places-autocomplete'
import { useTheme } from '../../theme'
import type { PlaceRef, ItineraryCategory } from '../../lib/schemas'

interface PlaceSearchTabProps {
  onPlaceSelected: (placeRef: PlaceRef, category: ItineraryCategory) => void
}

// Infer category from Google Place types
function inferCategory(types: string[]): ItineraryCategory {
  const typeSet = new Set(types)
  if (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('food')) return 'food'
  if (typeSet.has('lodging')) return 'stay'
  if (typeSet.has('transit_station') || typeSet.has('airport')) return 'transport'
  if (typeSet.has('shopping_mall') || typeSet.has('store')) return 'shopping'
  if (typeSet.has('amusement_park') || typeSet.has('park') || typeSet.has('natural_feature')) return 'activity'
  return 'attraction'
}

export function PlaceSearchTab({ onPlaceSelected }: PlaceSearchTabProps) {
  const { colors, text, spacing, radius } = useTheme()
  const apiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY ?? ''

  return (
    <View style={[styles.container, { padding: spacing.lg }]}>
      <GooglePlacesAutocomplete
        placeholder="Search a place..."
        fetchDetails
        onPress={(_, details = null) => {
          if (!details) return

          const detailsAny = details as any
          const placeRef: PlaceRef = {
            placeId:   detailsAny.place_id,
            name:      detailsAny.name,
            address:   detailsAny.formatted_address || '',
            lat:       detailsAny.geometry.location.lat,
            lng:       detailsAny.geometry.location.lng,
            rating:    detailsAny.rating,
            types:     detailsAny.types,
            website:   detailsAny.website,
            phone:     detailsAny.international_phone_number,
          }

          const category = inferCategory(details.types ?? [])
          onPlaceSelected(placeRef, category)
        }}
        query={{
          key:      apiKey,
          language: 'en',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInput: {
            backgroundColor:   colors.bgTertiary,
            color:             colors.textPrimary,
            fontSize:          text.body.md.fontSize,
            fontFamily:        text.body.md.fontFamily,
            borderRadius:      radius.md,
            paddingHorizontal: spacing.md,
            height:            48,
          },
          listView: {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.md,
            marginTop:       spacing.xs,
          },
          row: {
            backgroundColor: colors.bgSecondary,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          },
          description: {
            color:      colors.textPrimary,
            fontSize:   text.body.sm.fontSize,
            fontFamily: text.body.sm.fontFamily,
          },
          separator: {
            backgroundColor: colors.border,
            height: 1,
          },
        }}
        enablePoweredByContainer={false}
        minLength={2}
        debounce={300}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:             { flex: 1 },
  autocompleteContainer: { flex: 0 },
})
