// functions/src/callable/getSuggestions.ts
// HTTPS Callable Cloud Function — Smart Place Suggestions.
// Called from the UI "Suggest places" button in the day planner (Prompt 2.2).
//
// SECURITY:
//   - Requires authenticated Firebase user (context.auth check)
//   - Google Places API key stored in Firebase Functions config — never client-side
//   - Results are NOT cached in Firestore — ephemeral, returned directly
//
// INPUT:
//   groupId:     string   — for context (destination, existing items)
//   dayId:       string   — to avoid suggesting already-added places
//   lat:         number   — center point for search
//   lng:         number   — center point for search
//   category?:   string   — filter by type ('food', 'attraction', etc.)
//   radius?:     number   — search radius in metres (default 5000)
//   maxResults?: number   — cap (default 6, max 10)
//
// GOOGLE PLACES API:
//   Uses Nearby Search (New) API — returns places within radius.
//   API key: functions.config().places.api_key
//   Set with: firebase functions:config:set places.api_key="YOUR_KEY"

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import axios from 'axios'
import type { SmartSuggestion, PlaceRef, ItineraryCategory } from '../../../src/lib/schemas/itinerary.schema'

const db = admin.firestore()

interface SuggestionsRequest {
  groupId:     string
  dayId:       string
  lat:         number
  lng:         number
  category?:   string
  radius?:     number
  maxResults?: number
}

// Map apna categories to Google Places types
const CATEGORY_TO_PLACE_TYPES: Record<string, string[]> = {
  food:       ['restaurant', 'cafe', 'bakery', 'bar'],
  attraction: ['tourist_attraction', 'museum', 'art_gallery', 'church', 'hindu_temple'],
  stay:       ['lodging'],
  activity:   ['amusement_park', 'aquarium', 'zoo', 'park', 'natural_feature'],
  shopping:   ['shopping_mall', 'store', 'market'],
  transport:  ['airport', 'train_station', 'bus_station', 'subway_station'],
}

export const getSuggestions = onCall(
  { region: 'asia-south1' },
  async (request) => {
    // Auth check — must be signed in
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be signed in to get suggestions.'
      )
    }

    const {
      groupId,
      dayId,
      lat,
      lng,
      category,
      radius     = 5000,
      maxResults = 6,
    } = request.data as SuggestionsRequest

    // Validate inputs
    if (!groupId || !dayId || !lat || !lng) {
      throw new HttpsError(
        'invalid-argument',
        'groupId, dayId, lat, and lng are required.'
      )
    }

    // Verify caller is a group member
    const groupSnap = await db.doc(`groups/${groupId}`).get()
    if (!groupSnap.exists) {
      throw new HttpsError('not-found', 'Group not found.')
    }
    const group = groupSnap.data() as any
    if (!group.memberIds?.includes(request.auth.uid)) {
      throw new HttpsError(
        'permission-denied',
        'Not a member of this group.'
      )
    }

    // Fetch existing items for this day (to deduplicate suggestions)
    const existingSnap = await db
      .collection(`groups/${groupId}/days/${dayId}/items`)
      .get()
    const existingPlaceIds = new Set(
      existingSnap.docs
        .map(d => d.data()?.placeRef?.placeId)
        .filter(Boolean)
    )

    // Build Google Places API request
    const apiKey   = functions.config().places?.api_key
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'Places API key not configured. Run: firebase functions:config:set places.api_key="YOUR_KEY"'
      )
    }

    const includedTypes = category
      ? (CATEGORY_TO_PLACE_TYPES[category] ?? ['point_of_interest'])
      : ['tourist_attraction', 'restaurant', 'park']

    const placesUrl = 'https://places.googleapis.com/v1/places:searchNearby'
    const placesBody = {
      includedTypes,
      maxResultCount: Math.min(maxResults * 2, 20),  // Fetch more to deduplicate
      locationRestriction: {
        circle: {
          center:  { latitude: lat, longitude: lng },
          radius:  radius,
        },
      },
      rankPreference: 'POPULARITY',
    }

    const placesResp = await axios.post(placesUrl, placesBody, {
      headers: {
        'Content-Type':  'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.photos',
          'places.types',
          'places.priceLevel',
          'places.websiteUri',
          'places.internationalPhoneNumber',
          'places.editorialSummary',
        ].join(','),
      },
    })

    const places = placesResp.data?.places ?? []

    // Map to SmartSuggestion[] — filter duplicates, cap at maxResults
    const suggestions: SmartSuggestion[] = places
      .filter((p: any) => !existingPlaceIds.has(p.id))
      .slice(0, maxResults)
      .map((p: any): SmartSuggestion => {
        const placeRef: PlaceRef = {
          placeId:    p.id,
          name:       p.displayName?.text ?? 'Unknown Place',
          address:    p.formattedAddress ?? '',
          lat:        p.location?.latitude  ?? lat,
          lng:        p.location?.longitude ?? lng,
          rating:     p.rating,
          photoRef:   p.photos?.[0]?.name,
          types:      p.types ?? [],
          priceLevel: p.priceLevel,
          website:    p.websiteUri,
          phone:      p.internationalPhoneNumber,
        }

        // Determine best time of day from place type
        const typeSet   = new Set(p.types ?? [])
        let bestTime: SmartSuggestion['bestTimeOfDay'] = 'anytime'
        if (typeSet.has('restaurant') || typeSet.has('bar')) bestTime = 'evening'
        else if (typeSet.has('museum') || typeSet.has('art_gallery')) bestTime = 'morning'
        else if (typeSet.has('tourist_attraction')) bestTime = 'morning'

        // Determine category from types
        let suggestCategory: ItineraryCategory = 'attraction'
        if (typeSet.has('restaurant') || typeSet.has('cafe')) suggestCategory = 'food'
        else if (typeSet.has('lodging')) suggestCategory = 'stay'
        else if (typeSet.has('shopping_mall') || typeSet.has('store')) suggestCategory = 'shopping'

        return {
          placeRef,
          category:     suggestCategory,
          reason:       p.editorialSummary?.text ?? 'Popular destination nearby',
          estimatedTime: suggestCategory === 'food' ? 60 : 120,
          bestTimeOfDay: bestTime,
        }
      })

    return { suggestions }
  }
)
