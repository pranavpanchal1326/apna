// src/screens/itinerary/SuggestionsCarousel.tsx
// Horizontal carousel of AI-suggested places at the bottom of the day plan.
// Calls getSuggestions Cloud Function on mount (or on manual refresh).
//
// STATES:
//   loading  — 3 skeleton chips in a row (shimmer)
//   loaded   — horizontal FlatList of SuggestionChip cards
//   empty    — hidden (no empty state — just don't render if 0 results)
//   error    — silent fail (log to Sentry, don't show error to user)
//
// Each chip: [place emoji] [place name] [distance badge]
// Tapping a chip opens AddItemSheet pre-filled with that place's PlaceRef.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useTheme } from '../../theme'
import { captureError } from '../../lib/sentry'
import { CATEGORY_META } from '../../lib/schemas'
import type { SmartSuggestion } from '../../lib/schemas'

interface SuggestionsCarouselProps {
  groupId:  string
  dayId:    string
  centerLat: number   // Center of suggestions search (from last item placeRef, or trip city)
  centerLng: number
  onSelect: (suggestion: SmartSuggestion) => void  // Opens AddItemSheet with pre-fill
}

function SuggestionChip({
  suggestion,
  onPress,
}: {
  suggestion: SmartSuggestion
  onPress: () => void
}) {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const meta = CATEGORY_META[suggestion.category]

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.bgTertiary,
          borderColor:     colors.borderAccent,
          borderRadius:    radius.lg,
          padding:         spacing.md,
          marginRight:     spacing.sm,
          width:           180,
          opacity:         pressed ? 0.75 : 1,
          ...shadows.card,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Suggest ${suggestion.placeRef.name}`}
    >
      <Text style={styles.chipEmoji}>{meta.emoji}</Text>

      <Text
        style={[text.body.sm, { color: colors.textPrimary, marginTop: spacing.xs }]}
        numberOfLines={2}
      >
        {suggestion.placeRef.name}
      </Text>

      <Text
        style={[text.label.sm, { color: colors.textSecondary, marginTop: spacing.xs }]}
        numberOfLines={1}
      >
        {suggestion.reason}
      </Text>

      {suggestion.placeRef.rating && (
        <Text style={[text.mono.sm, { color: colors.accentGold, marginTop: spacing.xs }]}>
          ⭐ {suggestion.placeRef.rating.toFixed(1)}
        </Text>
      )}
    </Pressable>
  )
}

function SkeletonChip() {
  const { colors, spacing, radius } = useTheme()
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.bgTertiary,
          borderRadius:    radius.lg,
          padding:         spacing.md,
          marginRight:     spacing.sm,
          width:           180,
          height:          100,
        },
      ]}
    />
  )
}

export function SuggestionsCarousel({
  groupId,
  dayId,
  centerLat,
  centerLng,
  onSelect,
}: SuggestionsCarouselProps) {
  const { colors, text, spacing } = useTheme()
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [loading, setLoading]         = useState(true)
  const fetchedRef                    = useRef(false)

  const fetchSuggestions = useCallback(async () => {
    if (!centerLat || !centerLng) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const functions   = getFunctions()
      const getSugg     = httpsCallable<unknown, { suggestions: SmartSuggestion[] }>(
        functions, 'getSuggestions'
      )
      const result = await getSugg({ groupId, dayId, lat: centerLat, lng: centerLng })
      setSuggestions(result.data.suggestions || [])
    } catch (err) {
      captureError(err, { source: 'SuggestionsCarousel.fetch' })
      // Silent fail — carousel simply doesn't appear
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [groupId, dayId, centerLat, centerLng])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchSuggestions()
  }, [fetchSuggestions])

  // Don't render if no lat/lng or no suggestions and not loading
  if (!loading && suggestions.length === 0) return null

  return (
    <View style={[styles.container, { paddingTop: spacing.xl }]}>
      <Text
        style={[
          text.label.md,
          {
            color:         colors.textSecondary,
            paddingHorizontal: spacing.lg,
            marginBottom:  spacing.sm,
            letterSpacing: 1,
            textTransform: 'uppercase',
          },
        ]}
      >
        Suggested nearby
      </Text>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        data={loading ? (Array(3).fill(null) as null[]) : suggestions}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) =>
          loading ? (
            <SkeletonChip key={index} />
          ) : (
            <SuggestionChip
              suggestion={item as SmartSuggestion}
              onPress={() => onSelect(item as SmartSuggestion)}
            />
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},
  chip: {
    borderWidth: 1,
  },
  chipEmoji: {
    fontSize: 24,
  },
})
