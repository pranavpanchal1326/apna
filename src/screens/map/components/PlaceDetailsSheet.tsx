// src/screens/map/components/PlaceDetailsSheet.tsx
// Adapts dynamically to render itinerary details, squad member telemetry, or check-in prompts.

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, TextInput } from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { useTheme } from '../../../theme'
import { Button } from '../../../components'
import type { ItineraryItem } from '../../../lib/schemas'
import type { MemberLocation } from '../../../lib/types/location.types'
import { CATEGORY_META } from '../../../lib/schemas'

export type SelectedPin =
  | { type: 'itinerary'; item: ItineraryItem }
  | { type: 'member'; location: MemberLocation }
  | { type: 'place'; place: { name: string; address: string; lat: number; lng: number; placeId?: string } }

export type PlaceDetailsSheetRef = {
  open: (selection: SelectedPin) => void
  close: () => void
}

interface PlaceDetailsSheetProps {
  onCheckIn: (selection: SelectedPin, message?: string) => Promise<void>
}

export const PlaceDetailsSheet = forwardRef<PlaceDetailsSheetRef, PlaceDetailsSheetProps>(
  function PlaceDetailsSheet({ onCheckIn }, ref) {
    const { colors, spacing, radius, text } = useTheme()
    const sheetRef = useRef<BottomSheet>(null)
    const snapPoints = ['45%', '75%']

    const [selection, setSelection] = useState<SelectedPin | null>(null)
    const [isConfirmingCheckIn, setIsConfirmingCheckIn] = useState(false)
    const [checkInMessage, setCheckInMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useImperativeHandle(ref, () => ({
      open: (sel) => {
        setSelection(sel)
        setIsConfirmingCheckIn(false)
        setCheckInMessage('')
        setIsLoading(false)
        sheetRef.current?.snapToIndex(0)
      },
      close: () => {
        sheetRef.current?.close()
      },
    }))

    if (!selection) return null

    const handleStartCheckIn = () => {
      setIsConfirmingCheckIn(true)
      sheetRef.current?.snapToIndex(0) // keep at medium height for input focus
    }

    const handleConfirmCheckIn = async () => {
      setIsLoading(true)
      try {
        await onCheckIn(selection, checkInMessage.trim())
        sheetRef.current?.close()
      } catch (err) {
        console.error('[PlaceDetailsSheet] Check-in failed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.bgSecondary }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 36 }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {isConfirmingCheckIn ? (
              // ── CHECK-IN CONFIRMATION MODE ────────────────────────────────
              <View style={{ gap: spacing.md }}>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                  Check in here?
                </Text>
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                  At:{' '}
                  <Text style={{ fontFamily: 'Outfit-SemiBold' }}>
                    {selection.type === 'itinerary'
                      ? selection.item.title
                      : selection.type === 'place'
                      ? selection.place.name
                      : ''}
                  </Text>
                </Text>

                <TextInput
                  value={checkInMessage}
                  onChangeText={setCheckInMessage}
                  placeholder="Say something to the squad (optional)..."
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                  multiline
                  style={[
                    text.body.md,
                    styles.input,
                    {
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      color: colors.textPrimary,
                      backgroundColor: colors.bgTertiary,
                      padding: spacing.md,
                    },
                  ]}
                />

                <View style={styles.buttonRow}>
                  <Button
                    label="Back"
                    variant="ghost"
                    onPress={() => setIsConfirmingCheckIn(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Confirm Check-in"
                    variant="primary"
                    onPress={handleConfirmCheckIn}
                    loading={isLoading}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            ) : (
              // ── VIEW DETAILS MODE ─────────────────────────────────────────
              <View style={{ gap: spacing.md }}>
                {selection.type === 'itinerary' && (
                  // 🎒 Itinerary stop details
                  <>
                    <View style={styles.headerRow}>
                      <Text style={{ fontSize: 28 }}>
                        {selection.item.emoji ?? CATEGORY_META[selection.item.category]?.emoji ?? '📍'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                          {selection.item.title}
                        </Text>
                        <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                          Planned for Day {selection.item.dayId}
                        </Text>
                      </View>
                    </View>

                    {selection.item.placeRef?.address && (
                      <View>
                        <Text style={[text.label.sm, { color: colors.textSecondary }]}>ADDRESS</Text>
                        <Text style={[text.body.sm, { color: colors.textPrimary }]}>
                          {selection.item.placeRef.address}
                        </Text>
                      </View>
                    )}

                    {selection.item.notes && (
                      <View>
                        <Text style={[text.label.sm, { color: colors.textSecondary }]}>NOTES</Text>
                        <Text style={[text.body.sm, { color: colors.textPrimary }]}>
                          {selection.item.notes}
                        </Text>
                      </View>
                    )}

                    {/* Completion / Check-in summary */}
                    {selection.item.completedAt ? (
                      <View style={[styles.badge, { backgroundColor: colors.bgTertiary }]}>
                        <Text style={[text.label.sm, { color: colors.positive }]}>
                          ✓ Completed / Checked In
                        </Text>
                      </View>
                    ) : (
                      <Button
                        label="📍 Check In Here"
                        variant="primary"
                        onPress={handleStartCheckIn}
                        style={{ marginTop: spacing.md }}
                      />
                    )}
                  </>
                )}

                {selection.type === 'member' && (
                  // 👥 Live squad member details
                  <>
                    <View style={styles.headerRow}>
                      <View
                        style={[
                          styles.avatarLarge,
                          {
                            backgroundColor: selection.location.avatarColor,
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text style={[text.heading.md, { color: '#080C14', fontWeight: '700' }]}>
                          {selection.location.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                          {selection.location.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor:
                                  selection.location.status === 'live'
                                    ? colors.positive
                                    : selection.location.status === 'recent'
                                    ? colors.warning
                                    : colors.settled,
                              },
                            ]}
                          />
                          <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                            {selection.location.status === 'live'
                              ? 'Live Now'
                              : selection.location.status === 'recent'
                              ? 'Recent (last 5m)'
                              : 'Offline'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={[text.label.sm, { color: colors.textSecondary }]}>LAST UPDATED</Text>
                      <Text style={[text.body.sm, { color: colors.textPrimary }]}>
                        {new Date(selection.location.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View>
                      <Text style={[text.label.sm, { color: colors.textSecondary }]}>GPS ACCURACY</Text>
                      <Text style={[text.body.sm, { color: colors.textPrimary }]}>
                        ±{Math.round(selection.location.accuracy)} meters
                      </Text>
                    </View>
                  </>
                )}

                {selection.type === 'place' && (
                  // 🌅 Searched place details
                  <>
                    <View style={styles.headerRow}>
                      <Text style={{ fontSize: 28 }}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
                          {selection.place.name}
                        </Text>
                        <Text style={[text.body.sm, { color: colors.textSecondary }]} numberOfLines={2}>
                          {selection.place.address}
                        </Text>
                      </View>
                    </View>

                    <Button
                      label="📍 Check In Here"
                      variant="primary"
                      onPress={handleStartCheckIn}
                      style={{ marginTop: spacing.md }}
                    />
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  }
)

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  avatarLarge: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    height: 64,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
})
