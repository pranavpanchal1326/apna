// src/screens/hangouts/HangoutDetailScreen.tsx
// Full detail view for one hangout.
// Shows: title, time, place, budget, quorum status, live RSVP breakdown, confirmed badge.
// Primary action: RSVP bar.

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { CaretLeft, DotsThree, Confetti, CheckCircle, CalendarBlank, MapPin, CurrencyInr, Note, Check, Question, X, type IconProps } from 'phosphor-react-native'
import type { ComponentType, ReactNode } from 'react'
import { useTheme } from '../../theme'
import { useHangoutStore } from '../../stores/hangout.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { RsvpBar } from './components/RsvpBar'
import { ProposeSheet } from './components/ProposeSheet'
import {
  formatHangoutTime,
  hangoutDisplayState,
  isQuorumReached,
  myRsvp,
  rsvpUids,
} from '../../lib/utils/hangout'
import type { HangoutCreate, HangoutUpdate, RsvpValue } from '../../lib/schemas/hangout.schema'
import type { HangoutsStackParamList } from '../../navigation/types'

type RouteProps = RouteProp<HangoutsStackParamList, 'HangoutDetail'>

export function HangoutDetailScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const route      = useRoute<RouteProps>()
  const { hangoutId } = route.params

  const myUid       = useAuthStore((s) => s.user?.uid ?? '')
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const groupId     = activeGroup?.id ?? ''
  const groupSize   = activeGroup?.memberIds?.length ?? 4

  const {
    hangouts,
    castRsvp,
    cancelHangout,
    updateHangout,
  } = useHangoutStore()

  const hangout = hangouts.find((h) => h.id === hangoutId)
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const [rsvpPending, setRsvpPending] = useState(false)
  const [showEdit,    setShowEdit]    = useState(false)

  useEffect(() => {
    if (hangout) navigation.setOptions({ title: hangout.title })
  }, [hangout?.title, navigation, hangout])

  const handleRsvp = useCallback(async (value: RsvpValue) => {
    if (rsvpPending) return
    setRsvpPending(true)
    try {
      await castRsvp(groupId, hangoutId, myUid, value)
    } finally {
      setRsvpPending(false)
    }
  }, [rsvpPending, castRsvp, groupId, hangoutId, myUid])

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel hangout?',
      'This will mark the hangout as canceled for the whole group.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel hangout',
          style: 'destructive',
          onPress: async () => {
            await cancelHangout(groupId, hangoutId)
            navigation.goBack()
          },
        },
      ],
    )
  }, [cancelHangout, groupId, hangoutId, navigation])

  const handleMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert(
      hangout?.title ?? 'Options',
      undefined,
      [
        { text: 'Edit',            onPress: () => setShowEdit(true) },
        { text: 'Cancel hangout',  style: 'destructive', onPress: handleCancel },
        { text: 'Close',           style: 'cancel' },
      ],
    )
  }, [hangout?.title, handleCancel])

  const handleEditSubmit = useCallback(async (data: HangoutCreate) => {
    if (!hangout) return
    const update: HangoutUpdate = {
      id:              hangout.id,
      title:           data.title,
      scheduledDate:   data.scheduledDate,
      scheduledTime:   data.scheduledTime,
      placeName:       data.placeName,
      budgetEstimate:  data.budgetEstimate,
      note:            data.note,
      quorumThreshold: data.quorumThreshold,
    }
    await updateHangout(groupId, update)
    setShowEdit(false)
  }, [hangout, updateHangout, groupId])

  if (!hangout) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accentPrimary} />
      </View>
    )
  }

  const displayState   = hangoutDisplayState(hangout)
  const myVote         = myRsvp(hangout, myUid)
  const confirmed      = displayState === 'confirmed'
  const canceled       = displayState === 'canceled'
  const past           = displayState === 'past'
  const canVote        = !canceled && !past
  const quorumReached  = isQuorumReached(hangout)
  const timeLabel      = formatHangoutTime(hangout)

  const yesUids   = rsvpUids(hangout, 'yes')
  const maybeUids = rsvpUids(hangout, 'maybe')
  const noUids    = rsvpUids(hangout, 'no')

  const nameForUid = (uid: string) =>
    members.get(uid)?.name ?? uid.slice(0, 6) + '…'

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          paddingTop:        insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom:     spacing.md,
          backgroundColor:   colors.bgSecondary,
          borderBottomColor: colors.hairline,
          borderBottomWidth: 1,
        },
      ]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <CaretLeft size={22} color={colors.accentPrimary} />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {confirmed && <Confetti size={16} color={colors.positive} />}
          <Text style={[text.body.lg, { color: colors.textPrimary, fontFamily: 'Outfit-SemiBold', flex: 1 }]} numberOfLines={1}>
            {hangout.title}
          </Text>
        </View>

        {!canceled && !past && (
          <Pressable onPress={handleMenu} hitSlop={8} accessibilityLabel="Options">
            <DotsThree size={22} color={colors.textSecondary} weight="bold" />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Confirmed banner ────────────────────────────────────────── */}
        {confirmed && (
          <View style={[styles.confirmedBanner, {
            backgroundColor: colors.positive + '15',
            borderBottomColor: colors.positive + '33',
            borderBottomWidth: 1,
            paddingHorizontal: spacing.lg,
            paddingVertical:   spacing.md,
          }]}>
            <View style={styles.bannerRow}>
              <CheckCircle size={16} color={colors.positive} weight="fill" />
              <Text style={[text.body.md, { color: colors.positive, fontFamily: 'Outfit-SemiBold' }]}>
                Confirmed! {hangout.yesCount} people going
              </Text>
            </View>
          </View>
        )}

        {/* ── Canceled banner ─────────────────────────────────────────── */}
        {canceled && (
          <View style={[styles.confirmedBanner, {
            backgroundColor:   colors.negative + '15',
            borderBottomColor: colors.negative + '33',
            borderBottomWidth: 1,
            paddingHorizontal: spacing.lg,
            paddingVertical:   spacing.md,
          }]}>
            <Text style={[text.body.md, { color: colors.negative, fontFamily: 'Outfit-SemiBold', textAlign: 'center' }]}>
              Canceled
            </Text>
          </View>
        )}

        {/* ── Details card ────────────────────────────────────────────── */}
        <View style={[styles.detailCard, {
          backgroundColor:  colors.bgSecondary,
          borderRadius:     radius.lg,
          borderColor:      colors.hairline,
          borderWidth:      1,
          margin:           spacing.lg,
          padding:          spacing.lg,
          gap:              spacing.sm,
        }]}>
          <DetailRow icon={<CalendarBlank size={16} color={colors.textSecondary} />} label={timeLabel} colors={colors} text={text} />
          {hangout.placeName      && <DetailRow icon={<MapPin size={16} color={colors.textSecondary} />} label={hangout.placeName}                     colors={colors} text={text} />}
          {hangout.budgetEstimate && <DetailRow icon={<CurrencyInr size={16} color={colors.textSecondary} />} label={`~₹${hangout.budgetEstimate} per head`} colors={colors} text={text} />}
          {hangout.note           && <DetailRow icon={<Note size={16} color={colors.textSecondary} />} label={hangout.note}                            colors={colors} text={text} />}
        </View>

        {/* ── Quorum status ───────────────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[text.label.lg, { color: colors.textSecondary, marginBottom: spacing.sm, fontFamily: 'Outfit-SemiBold' }]}>
            Quorum
          </Text>
          <View style={[styles.quorumCard, {
            backgroundColor: colors.bgSecondary,
            borderRadius:    radius.md,
            borderColor:     quorumReached ? colors.positive + '55' : colors.hairline,
            borderWidth:     1,
            padding:         spacing.md,
          }]}>
            {/* Progress bar */}
            <View style={[styles.quorumBar, { backgroundColor: colors.bgTertiary, borderRadius: 4, marginBottom: spacing.sm }]}>
              <View style={[
                styles.quorumFill,
                {
                  width:           `${Math.min(100, Math.round((hangout.yesCount / hangout.quorumThreshold) * 100))}%` as `${number}%`,
                  backgroundColor: quorumReached ? colors.positive : colors.accentPrimary + '99',
                  borderRadius:    4,
                },
              ]} />
            </View>
            <View style={styles.quorumTextRow}>
              {quorumReached && <CheckCircle size={14} color={colors.positive} weight="fill" />}
              <Text style={[text.body.sm, { color: colors.textSecondary, flex: 1 }]}>
                {quorumReached
                  ? `Quorum reached! ${hangout.yesCount} yes votes (needed ${hangout.quorumThreshold})`
                  : `${hangout.yesCount} of ${hangout.quorumThreshold} yes votes needed to confirm`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* ── RSVP action ─────────────────────────────────────────────── */}
        {canVote && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text style={[text.label.lg, { color: colors.textSecondary, marginBottom: spacing.sm, fontFamily: 'Outfit-SemiBold' }]}>
              Your RSVP
            </Text>
            <RsvpBar
              current={myVote}
              onVote={handleRsvp}
              isPending={rsvpPending}
              size="lg"
            />
          </View>
        )}

        {/* ── Attendance breakdown ─────────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[text.label.lg, { color: colors.textSecondary, marginBottom: spacing.sm, fontFamily: 'Outfit-SemiBold' }]}>
            Votes
          </Text>

          <RsvpGroupRow label="Yes" Icon={Check} color={colors.positive}     uids={yesUids}   nameForUid={nameForUid} text={text} radius={radius} spacing={spacing} />
          <RsvpGroupRow label="Maybe" Icon={Question} color={colors.warning}  uids={maybeUids} nameForUid={nameForUid} text={text} radius={radius} spacing={spacing} />
          <RsvpGroupRow label="No"  Icon={X} color={colors.negative}  uids={noUids}    nameForUid={nameForUid} text={text} radius={radius} spacing={spacing} />
        </View>
      </ScrollView>

      {/* Edit sheet */}
      <ProposeSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={handleEditSubmit}
        groupId={groupId}
        proposedBy={myUid}
        groupSize={groupSize}
        editing={hangout}
      />
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function DetailRow({
  icon, label, colors, text,
}: {
  icon:    ReactNode
  label:   string
  colors:  ReturnType<typeof useTheme>['colors']
  text:    ReturnType<typeof useTheme>['text']
}) {
  return (
    <View style={styles.detailRow}>
      <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
      <Text style={[text.body.md, { color: colors.textPrimary, flex: 1 }]}>{label}</Text>
    </View>
  )
}

function RsvpGroupRow({
  label, Icon, color, uids, nameForUid, text, radius, spacing,
}: {
  label:      string
  Icon:       ComponentType<IconProps>
  color:      string
  uids:       string[]
  nameForUid: (uid: string) => string
  text:       ReturnType<typeof useTheme>['text']
  radius:     ReturnType<typeof useTheme>['radius']
  spacing:    ReturnType<typeof useTheme>['spacing']
}) {
  if (uids.length === 0) return null
  return (
    <View style={[styles.rsvpGroup, { marginBottom: spacing.sm }]}>
      <View style={styles.rsvpGroupLabel}>
        <Icon size={14} color={color} weight="bold" />
        <Text style={[text.label.md, { color, fontFamily: 'Outfit-SemiBold' }]}>
          {label} ({uids.length})
        </Text>
      </View>
      <View style={styles.nameChips}>
        {uids.map((uid) => (
          <View
            key={uid}
            style={[styles.nameChip, {
              backgroundColor: color + '15',
              borderRadius:    radius.full,
              borderColor:     color + '44',
              borderWidth:     1,
              paddingHorizontal: 10,
              paddingVertical:  4,
            }]}
          >
            <Text style={[text.label.sm, { color }]}>{nameForUid(uid)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:          { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center' },
  confirmedBanner: {},
  detailCard:      {},
  detailRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bannerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quorumTextRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  section:         { marginBottom: 24 },
  quorumCard:      {},
  quorumBar:       { height: 8 },
  quorumFill:      { height: 8 },
  rsvpGroup:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rsvpGroupLabel:  { flexDirection: 'row', alignItems: 'center', gap: 4, width: 78 },
  nameChips:       { flexDirection: 'row', flexWrap: 'wrap', flex: 1, gap: 6 },
  nameChip:        {},
})
