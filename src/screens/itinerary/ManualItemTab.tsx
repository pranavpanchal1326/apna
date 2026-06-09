// src/screens/itinerary/ManualItemTab.tsx
// Manual entry tab in AddItemSheet — for notes, custom stops without a Google Place.
// Fields: title (required) + category picker + notes + estimated cost + time slot.
// Submits ItineraryItemInput via onSubmit callback.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../../theme'
import { Button } from '../../components'
import { CATEGORY_META } from '../../lib/schemas'
import type { ItineraryCategory, ItineraryItemInput } from '../../lib/schemas'

interface ManualItemTabProps {
  onSubmit: (input: Partial<ItineraryItemInput>) => void
  prefill?: {
    title?:    string
    category?: ItineraryCategory
    notes?:    string
  }
}

const CATEGORIES: ItineraryCategory[] = [
  'attraction', 'food', 'stay', 'transport', 'activity', 'shopping', 'note', 'custom',
]

export function ManualItemTab({ onSubmit, prefill }: ManualItemTabProps) {
  const { colors, text, spacing, radius } = useTheme()

  const [title,     setTitle]    = useState(prefill?.title    ?? '')
  const [category,  setCategory] = useState<ItineraryCategory>(prefill?.category ?? 'attraction')
  const [notes,     setNotes]    = useState(prefill?.notes    ?? '')
  const [cost,      setCost]     = useState('')
  const [startTime, setStartTime] = useState('')
  const [titleError, setTitleError] = useState('')

  function handleSubmit() {
    if (!title.trim()) {
      setTitleError('Title is required.')
      return
    }
    setTitleError('')

    const input: Partial<ItineraryItemInput> = {
      title:     title.trim(),
      category,
      notes:     notes.trim() || undefined,
      estimatedCost: cost ? parseInt(cost.replace(/[^0-9]/g, ''), 10) : undefined,
      timeSlot:  startTime ? { startTime } : undefined,
      isConfirmed: false,
      votes:     { up: [], down: [] },
      linkedExpenseIds: [],
    }

    onSubmit(input)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            What's the stop?
          </Text>
          <TextInput
            value={title}
            onChangeText={t => { setTitle(t); setTitleError('') }}
            placeholder="e.g. Amber Fort, lunch at Laxmi Misthan Bhandar..."
            placeholderTextColor={colors.textMuted}
            style={[
              text.body.md,
              {
                backgroundColor:   colors.bgTertiary,
                color:             colors.textPrimary,
                borderRadius:      radius.md,
                borderWidth:       1,
                borderColor:       titleError ? colors.accentDanger : colors.border,
                padding:           spacing.md,
                minHeight:         48,
              },
            ]}
            maxLength={100}
            returnKeyType="next"
            accessibilityLabel="Stop title"
          />
          {titleError ? (
            <Text style={[text.label.sm, { color: colors.accentDanger, marginTop: spacing.xs }]}>
              {titleError}
            </Text>
          ) : null}
        </View>

        {/* Category picker */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Category
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => {
              const meta     = CATEGORY_META[cat]
              const isActive = category === cat
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? `${colors.accentPrimary}18` : colors.bgTertiary,
                      borderColor:     isActive ? colors.accentPrimary : colors.border,
                      borderRadius:    radius.sm,
                      padding:         spacing.sm,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={meta.label}
                >
                  <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                  <Text style={[text.label.sm, { color: isActive ? colors.accentPrimary : colors.textSecondary, marginTop: 2 }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Estimated cost */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Est. cost (₹)
          </Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[
              text.mono.md,
              {
                backgroundColor: colors.bgTertiary,
                color:           colors.textPrimary,
                borderRadius:    radius.md,
                borderWidth:     1,
                borderColor:     colors.border,
                padding:         spacing.md,
                height:          48,
              },
            ]}
            maxLength={8}
            accessibilityLabel="Estimated cost in rupees"
          />
        </View>

        {/* Time */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Start time (optional)
          </Text>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:30"
            placeholderTextColor={colors.textMuted}
            style={[
              text.mono.md,
              {
                backgroundColor: colors.bgTertiary,
                color:           colors.textPrimary,
                borderRadius:    radius.md,
                borderWidth:     1,
                borderColor:     colors.border,
                padding:         spacing.md,
                height:          48,
                width:           120,
              },
            ]}
            maxLength={5}
            accessibilityLabel="Start time in HH:MM format"
          />
        </View>

        {/* Notes */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Opening hours, entry fee, tips for the group..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              text.body.sm,
              {
                backgroundColor: colors.bgTertiary,
                color:           colors.textPrimary,
                borderRadius:    radius.md,
                borderWidth:     1,
                borderColor:     colors.border,
                padding:         spacing.md,
                minHeight:       80,
                textAlignVertical: 'top',
              },
            ]}
            maxLength={500}
            accessibilityLabel="Notes about this stop"
          />
        </View>

        <Button
          variant="primary"
          label="Add to plan"
          onPress={handleSubmit}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  categoryChip: {
    alignItems:  'center',
    borderWidth: 1,
    width:       72,
    minHeight:   60,
    justifyContent: 'center',
    gap: 2,
  },
})
