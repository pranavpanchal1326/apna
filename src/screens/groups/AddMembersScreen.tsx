import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, Header, Button } from '@components'
import { useGroupSettings } from '@hooks/useGroupSettings'
import { useGroupStore } from '../../stores/group.store'
import { useContactSuggestions } from '../../hooks/useContactSuggestions'
import {
  ContactPermissionCard,
  ContactSuggestionRow,
  ContactSuggestionsSheet,
} from '../../components/members'
import { normalisePhoneNumber } from '../../lib/contacts/reader'
import { hashPhoneNumber, truncateHashForLookup } from '../../lib/contacts/hasher'
import { getDocs, query, where } from 'firebase/firestore'
import { usersCol } from '../../lib/firebase/collections'
import { createMMKV } from 'react-native-mmkv'
import type { HomeStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'GroupMembersManage'>

interface AddMembersScreenProps {
  route: { params: { groupId: string } }
}

const contactsUiStorage = createMMKV({ id: 'apna-contacts-ui' })
const DISMISSED_KEY = 'contacts_card_dismissed'

export function AddMembersScreen({ route }: AddMembersScreenProps) {
  const { groupId } = route.params
  const { colors, spacing, radius, text } = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const { group, members, membersLoading } = useGroupSettings(groupId)
  const existingMemberIds = useMemo(() => group?.memberIds ?? [], [group?.memberIds])

  const {
    suggestions,
    isLoading: suggestionsLoading,
    permissionStatus,
    hasPermission,
    error: suggestionsError,
    requestPermission,
    refresh,
    addMember,
  } = useContactSuggestions({
    groupId,
    existingMemberIds,
  })

  const [phone, setPhone] = useState('')
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  
  // Persist dismissed permission card state in session
  const [cardDismissed, setCardDismissed] = useState(() => {
    return contactsUiStorage.getBoolean(DISMISSED_KEY) ?? false
  })

  const handleDismissPermissionCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    contactsUiStorage.set(DISMISSED_KEY, true)
    setCardDismissed(true)
  }, [])

  // Clear dismissal on mount for a fresh session if required,
  // or let MMKV persist it per-app-boot. For true session behavior:
  // MMKV key is fine, we can keep it as is.

  const handleShareInvite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!group?.inviteCode) return
    try {
      await Share.share({
        message: `Join our trip "${group.name}" using invite code: ${group.inviteCode}\n\nDownload apna to manage trip expenses and itinerary!`,
      })
    } catch (err) {
      Alert.alert('Share Failed', 'Could not open share dialog.')
    }
  }, [group])

  const handleManualAdd = async () => {
    if (!phone.trim()) return
    setIsSearchingUser(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const normalised = normalisePhoneNumber(phone)
      if (!normalised) {
        throw new Error('Please enter a valid 10-digit Indian phone number.')
      }

      if (group && group.memberIds.length >= 30) {
        throw new Error('This group is full (max 30 members).')
      }

      // Compute hash and query Firestore
      const fullHash = await hashPhoneNumber(normalised)
      const truncated = truncateHashForLookup(fullHash)

      const q = query(usersCol(), where('phoneHash', '==', truncated))
      const querySnap = await getDocs(q)

      if (querySnap.empty) {
        // User not found on apna, offer invite code sharing
        Alert.alert(
          'User Not Found',
          'This phone number is not registered on apna. Would you like to share the group invite code instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share Code', onPress: handleShareInvite },
          ]
        )
        setIsSearchingUser(false)
        return
      }

      const matchedDoc = querySnap.docs[0]
      const targetUser = matchedDoc.data()

      if (existingMemberIds.includes(targetUser.uid)) {
        throw new Error(`${targetUser.name} is already a member of this group.`)
      }

      // Add user directly to the group
      await useGroupStore.getState().addMember(groupId, targetUser.uid)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Success', `${targetUser.name} added to the group!`)
      setPhone('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to search or add member.'
      Alert.alert('Error', msg)
    } finally {
      setIsSearchingUser(false)
    }
  }



  // Fail suggestions errors silently
  useEffect(() => {
    if (suggestionsError) {
      console.warn('[AddMembersScreen] Suggestions error:', suggestionsError)
    }
  }, [suggestionsError])

  const inlineSuggestions = useMemo(() => {
    return suggestions.slice(0, 5)
  }, [suggestions])

  const totalMembersCount = existingMemberIds.length
  const isLimitReached = totalMembersCount >= 30

  return (
    <Screen>
      <Header title="Add Members" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Contact Permission Card / Suggestions */}
        {!hasPermission && !cardDismissed && (
          <View style={{ marginBottom: spacing.lg }}>
            <ContactPermissionCard
              onRequestPermission={requestPermission}
              onDismiss={handleDismissPermissionCard}
            />
          </View>
        )}

        {hasPermission && suggestions.length > 0 && (
          <View style={[styles.suggestionsSection, { marginBottom: spacing.xl }]}>
            <View style={styles.sectionHeader}>
              <Text style={[text.label.md, { color: colors.textSecondary, fontFamily: 'Outfit-Bold' }]}>
                Suggested from contacts ({suggestions.length})
              </Text>
              
              {suggestions.length > 5 && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setSheetVisible(true)
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="See all contact suggestions"
                >
                  <Text style={[text.label.md, { color: colors.accentPrimary, fontFamily: 'Outfit-Bold' }]}>
                    See all
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.suggestionsList, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              {inlineSuggestions.map((item) => (
                <ContactSuggestionRow
                  key={item.uid}
                  user={item}
                  isAlreadyMember={item.isAlreadyMember}
                  onAdd={async () => {
                    if (isLimitReached) {
                      Alert.alert('Limit Reached', 'This group is full (max 30 members).')
                      throw new Error('Group full')
                    }
                    await addMember(item)
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* 2. Manual Phone Invite */}
        <Text style={[text.label.md, { color: colors.textSecondary, fontFamily: 'Outfit-Bold', marginBottom: spacing.sm }]}>
          Add manually
        </Text>
        
        <View style={[styles.inputRow, { marginBottom: spacing.md }]}>
          <TextInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v)
            }}
            placeholder="Enter phone number (e.g. 9876543210)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={15}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.bgSecondary,
                fontFamily: 'JetBrainsMono-Medium',
              },
            ]}
          />
          
          <Button
            label="Add"
            onPress={handleManualAdd}
            disabled={isSearchingUser || isLimitReached || !phone.trim()}
            loading={isSearchingUser}
            style={{ ...styles.addBtn, borderRadius: radius.md }}
          />
        </View>

        {isLimitReached && (
          <Text style={[text.body.sm, { color: colors.accentDanger, marginBottom: spacing.md }]}>
            This group has reached the limit of 30 members.
          </Text>
        )}

        {/* 3. Existing Members List */}
        <View style={[styles.membersSection, { marginTop: spacing.lg }]}>
          <Text style={[text.label.md, { color: colors.textSecondary, fontFamily: 'Outfit-Bold', marginBottom: spacing.md }]}>
            Current Squad ({totalMembersCount}/30)
          </Text>
          
          {membersLoading ? (
            <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: spacing.md }} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {Array.from(members.values()).map((member) => (
                <View
                  key={member.uid}
                  style={[
                    styles.memberRow,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.avatarSmall,
                      {
                        backgroundColor: member.avatarColor || colors.accentPrimary,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[styles.avatarTextSmall, { fontFamily: 'Outfit-Bold' }]}>
                      {member.name.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[text.body.sm, { color: colors.textPrimary, fontFamily: 'Outfit-Medium' }]}>
                      {member.name}
                    </Text>
                    <Text style={[text.label.sm, { color: colors.textSecondary, fontSize: 11 }]}>
                      {member.phone}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Contact suggestions bottom sheet */}
      {hasPermission && (
        <ContactSuggestionsSheet
          visible={sheetVisible}
          groupId={groupId}
          existingMemberIds={existingMemberIds}
          suggestions={suggestions}
          isLoading={suggestionsLoading}
          permissionStatus={permissionStatus}
          hasPermission={hasPermission}
          totalContactsScanned={suggestions.length}
          cachedAt={Date.now()} // Or pass cache date from hook if saved
          onRequestPermission={requestPermission}
          onAddMember={async (user) => {
            if (isLimitReached) {
              Alert.alert('Limit Reached', 'This group is full (max 30 members).')
              throw new Error('Group full')
            }
            await addMember(user)
          }}
          onClose={() => setSheetVisible(false)}
          onRefresh={refresh}
          shareInviteLink={handleShareInvite}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  suggestionsSection: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suggestionsList: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
  },
  addBtn: {
    width: 80,
    height: 48,
  },
  membersSection: {
    width: '100%',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontSize: 13,
    color: '#FFF',
  },
})
