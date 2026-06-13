// src/screens/group/GroupSettingsScreen.tsx
import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { haptics } from '@lib/haptics'
import { Screen, Header, Button, MediaPickerSheet } from '@components'
import {
  SettingsRow,
  DangerZoneCard,
  InviteCodeCard,
} from '@components/group'
import { useGroupSettings } from '@hooks/useGroupSettings'
import { usePhotoUpload } from '@hooks/usePhotoUpload'
import type { HomeStackParamList } from '@navigation/types'
import { getCachedTripWrap } from '../../lib/utils/tripWrapData'
import { ReferralShareRow } from '@components/referral'

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'GroupSettings'>

export function GroupSettingsScreen({ route }: { route: { params: { groupId: string } } }) {
  const { groupId } = route.params
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const {
    group,
    isAdmin,
    isCreator,
    inviteCode,
    onUpdateMeta,
    onLeaveGroup,
    onRegenerateInvite,
    onCompleteGroup,
    onDissolveGroup,
  } = useGroupSettings(groupId)

  const isTripOver = useMemo(() => {
    if (!group?.endDate) return false
    return new Date(group.endDate) < new Date()
  }, [group?.endDate])

  const hasCachedWrap = useMemo(() => {
    return group ? Boolean(getCachedTripWrap(group.id)) : false
  }, [group?.id])

  // Edit Modal State
  const [activeField, setActiveField] = useState<'name' | 'destination' | 'dates' | 'budget' | 'description' | null>(null)
  const [editValue, setEditValue]     = useState('')
  const [editValueEnd, setEditValueEnd] = useState('') // Only used for dates (endDate)
  const [isUpdating, setIsUpdating]   = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [galleryVisible, setGalleryVisible] = useState(false)

  const { state: uploadState, uploadPhotos } = usePhotoUpload()

  const handleCoverSelect = useCallback(async (uris: string[]) => {
    if (uris.length === 0) return
    const uri = uris[0]
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const results = await uploadPhotos({
        localUris: [uri],
        context: 'cover',
        groupId,
        referenceId: groupId,
      })
      if (results.length > 0) {
        await onUpdateMeta({ coverPhotoUrl: results[0].downloadUrl })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch (err: any) {
      console.error('[GroupSettings] Failed to upload cover photo:', err)
      Alert.alert('Upload Failed', err.message ?? 'Failed to upload group cover photo. It will be uploaded automatically when you are back online.')
    }
  }, [groupId, uploadPhotos, onUpdateMeta])

  // ── Share flow ─────────────────────────────────────────────────────────────
  const handleShareInvite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!inviteCode) return
    try {
      await Share.share({
        message: `Join our trip "${group?.name ?? 'apna'}" using invite code: ${inviteCode}\n\nDownload apna to manage trip expenses and itinerary!`,
      })
    } catch (err) {
      Alert.alert('Share Failed', 'Could not open share dialog.')
    }
  }, [inviteCode, group?.name])

  // ── Regenerate invite flow ─────────────────────────────────────────────────
  const handleRegenerateInvite = useCallback(async () => {
    Alert.alert(
      'Regenerate Invite?',
      'The current code will stop working immediately. New members must use the new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsRegenerating(true)
            try {
              await onRegenerateInvite(inviteCode)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not regenerate invite code. Please try again.')
            } finally {
              setIsRegenerating(false)
            }
          },
        },
      ]
    )
  }, [inviteCode, onRegenerateInvite])

  // ── Save field edits ───────────────────────────────────────────────────────
  const handleOpenEdit = useCallback((field: 'name' | 'destination' | 'dates' | 'budget' | 'description') => {
    if (!isAdmin) return
    setActiveField(field)
    if (field === 'dates') {
      setEditValue(group?.startDate ?? '')
      setEditValueEnd(group?.endDate ?? '')
    } else if (field === 'budget') {
      setEditValue(group?.totalBudget ? String(group.totalBudget) : '')
    } else if (field === 'description') {
      setEditValue(group?.description ?? '')
    } else {
      setEditValue((group as any)?.[field] ?? '')
    }
  }, [isAdmin, group])

  const handleSaveEdit = useCallback(async () => {
    if (!activeField) return
    setIsUpdating(true)
    try {
      if (activeField === 'dates') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (editValue && !dateRegex.test(editValue)) {
          throw new Error('Start date must be YYYY-MM-DD.')
        }
        if (editValueEnd && !dateRegex.test(editValueEnd)) {
          throw new Error('End date must be YYYY-MM-DD.')
        }
        await onUpdateMeta({ startDate: editValue || undefined, endDate: editValueEnd || undefined })
      } else if (activeField === 'budget') {
        const parsed = parseFloat(editValue)
        if (editValue && isNaN(parsed)) {
          throw new Error('Budget must be a valid number.')
        }
        await onUpdateMeta({ totalBudget: editValue ? parsed : undefined })
      } else {
        await onUpdateMeta({ [activeField]: editValue })
      }
      setActiveField(null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Could not save. Please check inputs.')
    } finally {
      setIsUpdating(false)
    }
  }, [activeField, editValue, editValueEnd, onUpdateMeta])

  // ── Leave group flow ───────────────────────────────────────────────────────
  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      'Leave Group?',
      'You’ll lose access to expenses, activity, and trip details for this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await onLeaveGroup()
              haptics.destructiveConfirmed()
              navigation.replace('HomeList')
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not leave group.')
            }
          },
        },
      ]
    )
  }, [onLeaveGroup, navigation])

  // ── Complete group flow ────────────────────────────────────────────────────
  const handleCompleteGroup = useCallback(() => {
    Alert.alert(
      'Mark Trip Complete?',
      'This marks the trip as finished. You can still view it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'default',
          onPress: async () => {
            try {
              await onCompleteGroup()
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not complete group.')
            }
          },
        },
      ]
    )
  }, [onCompleteGroup])

  // ── Dissolve group flow ────────────────────────────────────────────────────
  const handleDissolveGroup = useCallback(() => {
    Alert.alert(
      'Dissolve Group?',
      'This removes the group from all members. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dissolve',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDissolveGroup()
              haptics.destructiveConfirmed()
              navigation.replace('HomeList')
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not dissolve group.')
            }
          },
        },
      ]
    )
  }, [onDissolveGroup, navigation])

  const dateRangeStr = useMemo(() => {
    if (!group?.startDate) return 'Dates not set'
    return `${group.startDate} to ${group.endDate ?? ''}`
  }, [group])

  if (!group) {
    return (
      <Screen>
        <Header title="Group Settings" showBack />
        <View style={styles.center}>
          <Text style={[text.body.md, { color: colors.textMuted }]}>Group not found.</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title="Group Settings" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        
        {/* ── 1. Group Overview Card ────────────────────────────────────────── */}
        <Pressable
          onPress={isAdmin ? () => setGalleryVisible(true) : undefined}
          style={({ pressed }) => [
            styles.overviewCard,
            {
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.lg,
              marginBottom: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              opacity: pressed ? 0.95 : 1,
              ...shadows.card,
            }
          ]}
          disabled={!isAdmin}
          accessibilityLabel="Change group cover photo"
          accessibilityRole="button"
        >
          {(group as any).coverPhotoUrl ? (
            <Image
              source={{ uri: (group as any).coverPhotoUrl }}
              style={{ width: '100%', height: 140 }}
              resizeMode="cover"
            />
          ) : (
            isAdmin && (
              <View style={{ width: '100%', height: 64, backgroundColor: colors.accentPrimary + '15', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.accentPrimary }}>
                <Text style={[text.label.sm, { color: colors.accentPrimary, fontWeight: '700' }]}>
                  📸 ADD TRIP COVER PHOTO
                </Text>
              </View>
            )
          )}
          
          <View style={{ padding: spacing.lg }}>
            <View style={styles.emojiRow}>
              <Text style={{ fontSize: 48 }}>{group.coverEmoji ?? '✈️'}</Text>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>{group.name}</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                  {group.destination || 'No destination'}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.md }]} />
            
            <View style={styles.overviewMeta}>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>Dates: {dateRangeStr}</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>Status: {group.status}</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>Members: {group.memberIds?.length ?? 0}</Text>
              <Text style={[text.body.sm, { color: colors.textSecondary }]}>Currency: {group.currency ?? 'INR'}</Text>
              {group.totalBudget != null && (
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>Budget: ₹{group.totalBudget}</Text>
              )}
            </View>
          </View>

          {/* Progress Overlay during upload */}
          {uploadState.isUploading && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 20 }]}>
              <ActivityIndicator size="large" color={colors.accentPrimary} />
              <Text style={[text.label.md, { color: '#FFF', marginTop: spacing.sm, fontWeight: '700' }]}>
                Uploading Cover… {uploadState.progress}%
              </Text>
            </View>
          )}
        </Pressable>

        {/* ── 2. Invite Section ────────────────────────────────────────────── */}
        {inviteCode && (
          <View style={{ marginBottom: spacing.xl }}>
            <InviteCodeCard
              code={inviteCode}
              onShare={handleShareInvite}
              onRegenerate={isAdmin ? handleRegenerateInvite : undefined}
              isRegenerating={isRegenerating}
            />
          </View>
        )}

        <View style={{ marginBottom: spacing.xl }}>
          <ReferralShareRow
            entryPoint="group_settings"
            groupId={groupId}
            groupName={group.name}
          />
        </View>

        {/* ── 3. Edit Metadata Section ──────────────────────────────────────── */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          EDIT DETAILS
        </Text>
        <View style={[styles.cardGroup, { marginBottom: spacing.xl }]}>
          <SettingsRow
            label="Group Name"
            value={group.name}
            onPress={isAdmin ? () => handleOpenEdit('name') : undefined}
            disabled={!isAdmin}
          />
          <SettingsRow
            label="Destination"
            value={group.destination || 'Not set'}
            onPress={isAdmin ? () => handleOpenEdit('destination') : undefined}
            disabled={!isAdmin}
          />
          <SettingsRow
            label="Trip Dates"
            value={dateRangeStr}
            onPress={isAdmin ? () => handleOpenEdit('dates') : undefined}
            disabled={!isAdmin}
          />
          <SettingsRow
            label="Total Budget"
            value={group.totalBudget ? `₹${group.totalBudget}` : 'Not set'}
            onPress={isAdmin ? () => handleOpenEdit('budget') : undefined}
            disabled={!isAdmin}
          />
          <SettingsRow
            label="Description"
            value={group.description || 'Not set'}
            onPress={isAdmin ? () => handleOpenEdit('description') : undefined}
            disabled={!isAdmin}
          />
        </View>

        {/* ── 4. Member Manage Row ─────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing.xl }}>
          <SettingsRow
            label="Manage Members"
            rightMeta={`${group.memberIds?.length ?? 0} members`}
            onPress={() => navigation.navigate('GroupMembersManage', { groupId })}
          />
        </View>

        {/* ── 5. Trip Wrap Row ────────────────────────────────────────────── */}
        {(group.status === 'completed' || isTripOver) && (
          <View style={{ marginBottom: spacing.xl }}>
            <SettingsRow
              label={hasCachedWrap ? 'View Trip Wrap' : 'Generate Trip Wrap'}
              rightMeta="🎬"
              onPress={() => navigation.navigate('TripWrap', { groupId })}
            />
          </View>
        )}

        {/* ── 6. Danger Zone ───────────────────────────────────────────────── */}
        <DangerZoneCard>
          <SettingsRow
            label="Leave Group"
            danger
            onPress={handleLeaveGroup}
          />
          {isAdmin && group.status !== 'completed' && (
            <SettingsRow
              label="Mark Trip Complete"
              onPress={handleCompleteGroup}
            />
          )}
          {isCreator && (
            <SettingsRow
              label="Dissolve Group"
              danger
              onPress={handleDissolveGroup}
            />
          )}
        </DangerZoneCard>

      </ScrollView>

      {/* ── Edit Modal Overlay ──────────────────────────────────────────────── */}
      <Modal
        visible={activeField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveField(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderRadius: radius.lg, padding: spacing.xl }]}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              Edit {activeField ? activeField.charAt(0).toUpperCase() + activeField.slice(1) : ''}
            </Text>

            {activeField === 'dates' ? (
              <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Start date (YYYY-MM-DD)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.md }]}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TextInput
                  value={editValueEnd}
                  onChangeText={setEditValueEnd}
                  placeholder="End date (YYYY-MM-DD)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.md }]}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            ) : (
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter new ${activeField}`}
                placeholderTextColor={colors.textMuted}
                multiline={activeField === 'description'}
                numberOfLines={activeField === 'description' ? 3 : 1}
                keyboardType={activeField === 'budget' ? 'numeric' : 'default'}
                style={[
                  styles.input,
                  {
                    color:        colors.textPrimary,
                    borderColor:  colors.border,
                    borderRadius: radius.md,
                    marginBottom: spacing.lg,
                    height:       activeField === 'description' ? 80 : 44,
                  },
                ]}
                autoFocus
              />
            )}

            <View style={styles.modalBtnRow}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setActiveField(null)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                variant="primary"
                onPress={handleSaveEdit}
                loading={isUpdating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Media Picker Sheet Overlay */}
      <MediaPickerSheet
        visible={galleryVisible}
        maxPhotos={1}
        onSelect={handleCoverSelect}
        onClose={() => setGalleryVisible(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overviewCard: {},
  emojiRow:     { flexDirection: 'row', alignItems: 'center' },
  divider:      { height: 1, width: '100%' },
  overviewMeta: { gap: 4 },
  cardGroup:    { gap: 1 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 360, elevation: 5 },
  input:        { borderWidth: 1, paddingHorizontal: 12, height: 44, fontSize: 16 },
  modalBtnRow:  { flexDirection: 'row', gap: 12 },
})
