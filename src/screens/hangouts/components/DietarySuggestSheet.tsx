// src/screens/hangouts/components/DietarySuggestSheet.tsx
// Phase 7.5 — dietary-friendly restaurant ideas for planning a food hangout.
// Server AI gateway does the work; this sheet is chips → results.

import { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { BottomSheet } from '@components/ui/BottomSheet'
import { fetchDietarySuggestions, type DietarySuggestion } from '@lib/firebase/ai'

const DIETARY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'vegetarian', label: '🥗 Vegetarian' },
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'jain', label: '🙏 Jain' },
  { key: 'halal', label: '☪️ Halal' },
  { key: 'gluten-free', label: '🌾 Gluten-free' },
  { key: 'no-onion-garlic', label: '🧅 No onion-garlic' },
]

interface Props {
  visible: boolean
  onClose: () => void
  groupId: string
  destination: string
}

export function DietarySuggestSheet({ visible, onClose, groupId, destination }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<DietarySuggestion[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleSelect = useCallback(
    async (dietary: string) => {
      Haptics.selectionAsync()
      setSelected(dietary)
      setResults(null)
      setFailed(false)
      setIsLoading(true)
      const suggestions = await fetchDietarySuggestions(groupId, destination, dietary)
      setIsLoading(false)
      if (suggestions) {
        setResults(suggestions)
      } else {
        setFailed(true)
      }
    },
    [groupId, destination],
  )

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Food ideas in ${destination}`}>
      <ScrollView style={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Dietary chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {DIETARY_OPTIONS.map((option) => {
            const isActive = selected === option.key
            return (
              <Pressable
                key={option.key}
                onPress={() => handleSelect(option.key)}
                disabled={isLoading}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: isActive ? colors.accentPrimary : colors.border,
                  backgroundColor: isActive ? colors.accentPrimary + '20' : colors.bgSecondary,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Suggest ${option.key} spots`}
              >
                <Text style={[text.body.sm, { color: isActive ? colors.accentPrimary : colors.textPrimary }]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Results */}
        <View style={{ marginTop: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {isLoading && (
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <ActivityIndicator color={colors.accentPrimary} />
              <Text style={[text.body.sm, { color: colors.textMuted, marginTop: spacing.sm }]}>
                Finding good spots…
              </Text>
            </View>
          )}

          {failed && !isLoading && (
            <Text style={[text.body.sm, { color: colors.textMuted, textAlign: 'center', padding: spacing.lg }]}>
              Could not fetch ideas right now — try again in a bit.
            </Text>
          )}

          {results?.map((suggestion, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              <Text style={[text.body.md, { color: colors.textPrimary, fontWeight: '600' }]}>
                {suggestion.name}
              </Text>
              {suggestion.area ? (
                <Text style={[text.label.sm, { color: colors.accentPrimary, marginTop: 2 }]}>
                  📍 {suggestion.area}
                </Text>
              ) : null}
              {suggestion.why ? (
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  {suggestion.why}
                </Text>
              ) : null}
            </View>
          ))}

          {!isLoading && !failed && !results && (
            <Text style={[text.body.sm, { color: colors.textMuted, textAlign: 'center', padding: spacing.lg }]}>
              Pick a dietary preference to get 5 spot ideas — double-check timings before you go.
            </Text>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  )
}
