// src/screens/tripWrap/TripWrapScreen.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native'
import { useRoute, RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Screen, Header, Button } from '@components'
import { useTheme } from '@theme'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useExpenses } from '@hooks/useExpenses'
import { fetchMemories } from '@lib/firebase/memories'
import { fetchDayPlans, fetchDayItems } from '@lib/firebase/itinerary'
import type { MemoryInput, ItineraryItem } from '@lib/schemas'
import {
  buildTripWrapData,
  getCachedTripWrap,
  cacheTripWrap,
  clearCachedTripWrap,
  type TripWrapBundle,
} from '../../lib/utils/tripWrapData'
import { PublicRecapCard, PUBLIC_RECAP_CARD_WIDTH, PUBLIC_RECAP_CARD_HEIGHT } from '@components/recap'
import { ReelOverlayFrame, MemoryReelExportPanel } from '@components/reel'
import { useTripRecap } from '@hooks/useTripRecap'
import { useMemoryReelExport } from '@hooks/useMemoryReelExport'
import { shareRecapCard } from '@lib/recap/share'
import type { RecapVisibility } from '@lib/schemas/publicRecap.schema'
import { HomeStackParamList } from '../../navigation/types'

type TripWrapRouteProp = RouteProp<HomeStackParamList, 'TripWrap'>

export function TripWrapScreen() {
  const { colors, text, spacing, radius, shadows } = useTheme()
  const route = useRoute<TripWrapRouteProp>()
  const { groupId } = route.params
  const { width: screenWidth } = useWindowDimensions()

  // 1. Group, Members, Expenses hooks
  const storeGroups = useGroupStore((s) => s.groups)
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const group = storeGroups.find((g) => g.id === groupId) || activeGroup

  const memberIds = group?.memberIds ?? []
  const { members, isLoading: membersLoading } = useGroupMembers(memberIds)
  const { expenses, isLoading: expensesLoading } = useExpenses(groupId)

  // 2. Extra data state
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([])
  const [memories, setMemories] = useState<MemoryInput[]>([])
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 3. Load extra data (memories and itinerary)
  const loadExtraData = useCallback(async () => {
    try {
      setLoadingExtra(true)
      const [plans, fetchedMemories] = await Promise.all([
        fetchDayPlans(groupId),
        fetchMemories(groupId),
      ])
      
      const itemPromises = plans.map((day) => fetchDayItems(groupId, day.id))
      const itemsList = await Promise.all(itemPromises)
      const allItems = itemsList.flat()

      setItineraryItems(allItems)
      setMemories(fetchedMemories)
    } catch (err) {
      console.error('[TripWrap] Failed to load memories/itinerary:', err)
    } finally {
      setLoadingExtra(false)
    }
  }, [groupId])

  useEffect(() => {
    loadExtraData()
  }, [loadExtraData, refreshTrigger])

  // 4. MMKV Caching and live generation
  const cached = useMemo(() => getCachedTripWrap(groupId), [groupId])
  const [wrapData, setWrapData] = useState<TripWrapBundle | null>(cached)

  const isHooksLoading = membersLoading || expensesLoading
  const isAllLoading = isHooksLoading && loadingExtra && !wrapData

  useEffect(() => {
    if (!isHooksLoading && !loadingExtra && group && members.size > 0 && expenses.length >= 0) {
      const freshData = buildTripWrapData({
        group,
        members: Array.from(members.values()),
        expenses,
        memories,
        itinerary: itineraryItems,
      })

      // Compare to cached to see if we should update
      if (
        !wrapData ||
        wrapData.totalSpend !== freshData.totalSpend ||
        wrapData.memoriesCount !== freshData.memoriesCount ||
        wrapData.placesVisitedCount !== freshData.placesVisitedCount ||
        wrapData.distanceTraveled !== freshData.distanceTraveled ||
        wrapData.groupName !== freshData.groupName
      ) {
        setWrapData(freshData)
        cacheTripWrap(groupId, freshData)
      }
    }
  }, [isHooksLoading, loadingExtra, group, members, expenses, memories, itineraryItems, groupId])

  // 5. Memory reel export
  const titleFrameRef = useRef<View>(null)
  const closingFrameRef = useRef<View>(null)
  const reelExport = useMemoryReelExport({
    group,
    memories,
    dateRange: wrapData?.dateRange,
    titleFrameRef,
    closingFrameRef,
  })

  // 6. Public recap generation & sharing
  const cardRef = useRef<View>(null)
  const [sharing, setSharing] = useState(false)
  const [includeSpend, setIncludeSpend] = useState(false)
  const [visibility, setVisibility] = useState<RecapVisibility>('unlisted')

  const {
    publicRecap,
    isGenerating,
    generateError,
    shareSuccess,
    setShareSuccess,
    publicUrl,
    createPublicRecap,
    setVisibility: updateVisibility,
  } = useTripRecap(groupId)

  const handleGenerateRecap = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await createPublicRecap({ includeSpend, visibility })
  }, [createPublicRecap, includeSpend, visibility])

  const handleVisibilityChange = useCallback(
    async (next: RecapVisibility) => {
      setVisibility(next)
      if (publicRecap) {
        await updateVisibility(next)
      }
    },
    [publicRecap, updateVisibility],
  )

  const handleShareCard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSharing(true)
    setShareSuccess(false)

    try {
      let recap = publicRecap
      if (!recap) {
        recap = await createPublicRecap({ includeSpend, visibility })
      }
      if (!recap) {
        Alert.alert('Not ready yet', generateError ?? 'Add more trip memories before sharing.')
        return
      }

      const result = await shareRecapCard({
        cardRef,
        recap,
        includeLink: visibility !== 'private',
      })

      if (result.success) {
        setShareSuccess(true)
      }
    } finally {
      setSharing(false)
    }
  }

  // 7. Manual Regeneration
  const handleRegenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    clearCachedTripWrap(groupId)
    setWrapData(null)
    setRefreshTrigger((prev) => prev + 1)
  }, [groupId])

  // 8. Preview scale math
  const previewScale = (screenWidth - spacing.lg * 2) / PUBLIC_RECAP_CARD_WIDTH

  if (isAllLoading) {
    return (
      <Screen>
        <Header title="Trip Wrap" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
          <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Remembering the good times...
          </Text>
        </View>
      </Screen>
    )
  }

  if (!wrapData) {
    return (
      <Screen>
        <Header title="Trip Wrap" showBack />
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🎒</Text>
          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center' }]}>
            Not enough squad data
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md, maxWidth: 280 }]}>
            Ensure your trip has dates, expenses, and itinerary stops recorded to generate your Wrap.
          </Text>
          <Button variant="primary" label="Retry" onPress={handleRegenerate} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title={`${wrapData.groupName} Wrap`} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['4xl'] }} showsVerticalScrollIndicator={false}>
        
        {/* Visual Hero Stats Row */}
        <View style={[styles.heroSection, { backgroundColor: colors.bgSecondary, padding: spacing.lg }]}>
          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg }]}>
            🎒 SQUAD STATS
          </Text>
          <View style={styles.statGrid}>
            <View style={[styles.statItem, { backgroundColor: colors.bgTertiary, borderRadius: radius.md }]}>
              <Text style={{ fontSize: 24 }}>🗓️</Text>
              <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{wrapData.tripDays}</Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Days Traveled</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.bgTertiary, borderRadius: radius.md }]}>
              <Text style={{ fontSize: 24 }}>💸</Text>
              <Text style={[text.heading.sm, { color: colors.accentPrimary }]}>
                {wrapData.currency === 'INR' ? '₹' : ''}
                {wrapData.totalSpend.toLocaleString('en-IN')}
              </Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Total Spend</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.bgTertiary, borderRadius: radius.md }]}>
              <Text style={{ fontSize: 24 }}>📸</Text>
              <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{wrapData.memoriesCount}</Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Memories</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.bgTertiary, borderRadius: radius.md }]}>
              <Text style={{ fontSize: 24 }}>📍</Text>
              <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{wrapData.placesVisitedCount}</Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Stops Visited</Text>
            </View>
          </View>
        </View>

        {/* Top Memories Selection */}
        {wrapData.topMemories.length > 0 && (
          <View style={{ padding: spacing.lg }}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              🌟 Highlight Moments
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {wrapData.topMemories.map((m) => (
                <View key={m.id} style={[styles.memoryCard, { backgroundColor: colors.bgSecondary, borderRadius: radius.md, ...shadows.card }]}>
                  {m.photoUrl ? (
                    <Image source={{ uri: m.photoUrl }} style={styles.memoryImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.memoryImg, { backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 32 }}>📝</Text>
                    </View>
                  )}
                  <View style={{ padding: spacing.sm }}>
                    <Text style={[text.body.sm, { color: colors.textSecondary }]} numberOfLines={2}>
                      {m.caption || 'A memorable stop.'}
                    </Text>
                    <View style={styles.reactionRow}>
                      <Text style={[text.label.sm, { color: colors.textMuted }]}>{m.date}</Text>
                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.bgTertiary }]}>
                          <Text style={{ fontSize: 10 }}>❤️ {Object.keys(m.reactions).length}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spend Breakdown by Category */}
        {wrapData.categoryBreakdown.length > 0 && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.bgSecondary }}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              📊 Spent by Category
            </Text>
            <View style={{ gap: spacing.md }}>
              {wrapData.categoryBreakdown.map((item) => (
                <View key={item.category}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={[text.label.md, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
                      {item.category}
                    </Text>
                    <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                      ₹{item.amount.toLocaleString('en-IN')} ({item.percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${item.percentage}%`,
                          backgroundColor: colors.accentPrimary,
                          borderRadius: radius.full,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Per-person cost logs */}
        <View style={{ padding: spacing.lg }}>
          <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            👥 Squad Balances
          </Text>
          <View style={{ gap: spacing.sm }}>
            {wrapData.perPersonSummary.map((m) => (
              <View key={m.uid} style={[styles.memberRow, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: spacing.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {m.photoUrl ? (
                    <Image source={{ uri: m.photoUrl }} style={[styles.avatar, { borderRadius: radius.full }]} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.bgTertiary, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={[text.label.sm, { color: colors.textSecondary }]}>{m.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ marginLeft: spacing.sm }}>
                    <Text style={[text.label.md, { color: colors.textPrimary }]}>{m.name}</Text>
                    <Text style={[text.label.sm, { color: colors.textMuted }]}>Captured {m.memoriesCount} moments</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[text.label.md, { color: colors.textPrimary }]}>
                    Paid: ₹{m.paidAmount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[text.label.sm, { color: m.netBalance >= 0 ? colors.positive : colors.negative }]}>
                    {m.netBalance >= 0 ? '+' : ''}₹{m.netBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Settlement Instructions */}
        {wrapData.settlementHighlights.length > 0 && (
          <View style={[styles.settlementsSection, { backgroundColor: colors.bgSecondary, padding: spacing.lg }]}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              💸 Settlements Highlights
            </Text>
            <View style={{ gap: spacing.md }}>
              {wrapData.settlementHighlights.map((s, idx) => (
                <View key={idx} style={[styles.settleCard, { backgroundColor: colors.bgTertiary, borderRadius: radius.md, padding: spacing.md }]}>
                  <Text style={[text.body.md, { color: colors.textPrimary }]}>
                    <Text style={{ fontFamily: 'Outfit-Bold' }}>{s.fromName}</Text> owes{' '}
                    <Text style={{ fontFamily: 'Outfit-Bold' }}>{s.toName}</Text>
                  </Text>
                  <Text style={[text.heading.sm, { color: colors.accentPrimary, marginTop: 4 }]}>
                    ₹{s.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Memory Reel MP4 Export */}
        <View style={{ padding: spacing.lg }}>
          <MemoryReelExportPanel
            plan={reelExport.plan}
            progress={reelExport.progress}
            isExporting={reelExport.isExporting}
            outputUri={reelExport.outputUri}
            errorMessage={
              reelExport.errorMessage ??
              (!reelExport.ffmpegAvailable
                ? 'Reel export requires a development build (FFmpeg not available in Expo Go).'
                : null)
            }
            onStartExport={() => void reelExport.startExport()}
            onCancelExport={reelExport.cancelExport}
            onShare={() => void reelExport.shareExport()}
            onRetry={reelExport.retryExport}
          />
        </View>

        {/* Offscreen frames for title/closing capture */}
        {reelExport.plan ? (
          <View style={styles.offscreen} pointerEvents="none">
            <View ref={titleFrameRef} collapsable={false}>
              <ReelOverlayFrame plan={reelExport.plan} variant="title" />
            </View>
            <View ref={closingFrameRef} collapsable={false}>
              <ReelOverlayFrame plan={reelExport.plan} variant="closing" />
            </View>
          </View>
        ) : null}

        {/* Public Shareable Recap — sanitized, no private balances */}
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={[text.heading.sm, { color: colors.textPrimary, alignSelf: 'flex-start', marginBottom: spacing.xs }]}>
            Share trip recap
          </Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, alignSelf: 'flex-start', marginBottom: spacing.md }]}>
            A polished memory card — private balances stay in the squad view above.
          </Text>

          <View style={[styles.shareOptions, { marginBottom: spacing.md, gap: spacing.sm }]}>
            <Pressable
              onPress={() => setIncludeSpend((v) => !v)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: includeSpend ? colors.accentPrimary : colors.bgTertiary,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[text.label.sm, { color: includeSpend ? colors.bgPrimary : colors.textSecondary }]}>
                Include spend
              </Text>
            </Pressable>
            {(['unlisted', 'public', 'private'] as RecapVisibility[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => void handleVisibilityChange(mode)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: visibility === mode ? colors.bgSecondary : colors.bgTertiary,
                    borderColor: visibility === mode ? colors.accentPrimary : colors.border,
                    borderRadius: radius.full,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[text.label.sm, { color: colors.textSecondary, textTransform: 'capitalize' }]}>
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>

          {(publicRecap || wrapData) && (
            <View
              style={{
                height: PUBLIC_RECAP_CARD_HEIGHT * previewScale,
                width: PUBLIC_RECAP_CARD_WIDTH * previewScale,
                overflow: 'hidden',
              }}
            >
              <View
                ref={cardRef}
                collapsable={false}
                style={{
                  width: PUBLIC_RECAP_CARD_WIDTH,
                  height: PUBLIC_RECAP_CARD_HEIGHT,
                  transform: [{ scale: previewScale }],
                  transformOrigin: 'top left',
                }}
              >
                <PublicRecapCard
                  recap={
                    publicRecap ?? {
                      id: 'preview',
                      groupId,
                      tripName: wrapData.groupName,
                      destination: group?.destination,
                      startDate: group?.startDate,
                      endDate: group?.endDate,
                      dateRangeLabel: wrapData.dateRange,
                      createdAt: Date.now(),
                      createdBy: '',
                      topPhotos: wrapData.topMemories
                        .map((m) => m.photoThumb || m.photoUrl)
                        .filter((u): u is string => Boolean(u))
                        .slice(0, 6),
                      coverEmoji: group?.coverEmoji,
                      currency: wrapData.currency,
                      memberCount: wrapData.memberCount,
                      memoriesCount: wrapData.memoriesCount,
                      placesCount: wrapData.placesVisitedCount,
                      daysCount: wrapData.tripDays,
                      shareSlug: 'preview',
                      isPublic: visibility === 'public',
                      visibility,
                      template: 'default',
                      includeSpend,
                      version: 1,
                    }
                  }
                />
              </View>
            </View>
          )}

          {generateError ? (
            <Text style={[text.body.sm, { color: colors.negative, marginTop: spacing.sm, textAlign: 'center' }]}>
              {generateError}
            </Text>
          ) : null}

          {shareSuccess ? (
            <Text style={[text.body.sm, { color: colors.positive, marginTop: spacing.sm, textAlign: 'center' }]}>
              Recap shared successfully.
            </Text>
          ) : null}

          {publicUrl && visibility !== 'private' ? (
            <Text style={[text.body.sm, { color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' }]} numberOfLines={2}>
              {publicUrl}
            </Text>
          ) : null}

          <Button
            variant="primary"
            label={
              sharing || isGenerating
                ? 'Preparing recap...'
                : 'Share recap'
            }
            onPress={handleShareCard}
            disabled={sharing || isGenerating}
            style={{ width: '100%', marginTop: spacing.md }}
          />

          <Button
            variant="secondary"
            label="Refresh public recap"
            onPress={handleGenerateRecap}
            disabled={isGenerating}
            style={{ width: '100%', marginTop: spacing.sm }}
          />

          <Pressable onPress={handleRegenerate} style={{ marginTop: spacing.lg }}>
            <Text style={[text.body.sm, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
              Regenerate squad data
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heroSection: {
    width: '100%',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  statItem: {
    width: '45%',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryCard: {
    width: 150,
    overflow: 'hidden',
  },
  memoryImg: {
    width: '100%',
    height: 100,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  barBg: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
  },
  settlementsSection: {
    width: '100%',
  },
  settleCard: {
    width: '100%',
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
})
