import { useEffect, useRef, useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useTheme } from '@theme'
import { BottomSheet } from '../ui/BottomSheet'
import { ContactSuggestionRow } from './ContactSuggestionRow'
import { ContactPermissionCard } from './ContactPermissionCard'
import type { MatchedUser } from '../../lib/contacts/cache'
import type { ContactsPermissionStatus } from '../../lib/contacts/permissions'
import * as Haptics from 'expo-haptics'

interface ContactSuggestionsSheetProps {
  visible: boolean
  groupId: string
  existingMemberIds: string[]
  suggestions: MatchedUser[]
  isLoading: boolean
  permissionStatus: ContactsPermissionStatus
  hasPermission: boolean
  totalContactsScanned: number
  cachedAt: number | null
  onRequestPermission(): Promise<void>
  onAddMember(user: MatchedUser): Promise<void>
  onClose(): void
  onRefresh(): Promise<void>
  shareInviteLink(): void
}

function SkeletonRow() {
  const { colors, radius } = useTheme()
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [pulseAnim])

  return (
    <View style={styles.skeletonRow}>
      <Animated.View
        style={[
          styles.skeletonAvatar,
          { backgroundColor: colors.border, borderRadius: radius.full, opacity: pulseAnim },
        ]}
      />
      <View style={styles.skeletonDetails}>
        <Animated.View
          style={[
            styles.skeletonName,
            { backgroundColor: colors.border, borderRadius: radius.sm, opacity: pulseAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonPhone,
            { backgroundColor: colors.border, borderRadius: radius.sm, opacity: pulseAnim, marginTop: 6 },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.skeletonButton,
          { backgroundColor: colors.border, borderRadius: radius.full, opacity: pulseAnim },
        ]}
      />
    </View>
  )
}

export function ContactSuggestionsSheet({
  visible,
  suggestions,
  isLoading,
  hasPermission,
  totalContactsScanned,
  cachedAt,
  onRequestPermission,
  onAddMember,
  onClose,
  onRefresh,
  shareInviteLink,
}: ContactSuggestionsSheetProps) {
  const { colors, spacing, text, layout } = useTheme()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const minutesAgoStr = useMemo(() => {
    if (!cachedAt) return 'Updated just now'
    const diffMins = Math.round((Date.now() - cachedAt) / 60000)
    if (diffMins <= 0) return 'Updated just now'
    return `Updated ${diffMins}m ago`
  }, [cachedAt, visible, suggestions])

  // Split suggestions into: non-members and already-members
  const { nonMembers, alreadyMembers } = useMemo(() => {
    const non: MatchedUser[] = []
    const members: MatchedUser[] = []
    suggestions.forEach((s) => {
      if (s.isAlreadyMember) {
        members.push(s)
      } else {
        non.push(s)
      }
    })
    return { nonMembers: non, alreadyMembers: members }
  }, [suggestions])

  // Combine lists for Section-like structure in FlatList
  const flatListData = useMemo(() => {
    const list: Array<{ type: 'header' | 'suggestion'; user?: MatchedUser; title?: string }> = []
    
    if (nonMembers.length > 0) {
      nonMembers.forEach((u) => list.push({ type: 'suggestion', user: u }))
    }
    
    if (alreadyMembers.length > 0) {
      list.push({ type: 'header', title: 'Already in this group' })
      alreadyMembers.forEach((u) => list.push({ type: 'suggestion', user: u }))
    }
    
    return list
  }, [nonMembers, alreadyMembers])

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border }]}>
        <Text
          style={[
            text.heading.sm,
            {
              color: colors.textPrimary,
              fontFamily: 'Outfit-SemiBold',
              fontSize: 16,
              flex: 1,
            },
          ]}
        >
          People you know on apna
        </Text>
        
        {hasPermission && (
          <Pressable
            onPress={handleRefresh}
            disabled={isLoading || isRefreshing}
            style={styles.refreshBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Refresh suggestions"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.accentPrimary} />
            ) : (
              <Text style={{ fontSize: 18, color: colors.accentPrimary }}>⟳</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Body Content */}
      <View style={styles.body}>
        {isLoading && !isRefreshing ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : !hasPermission ? (
          <View style={{ padding: spacing.lg }}>
            <ContactPermissionCard
              onRequestPermission={onRequestPermission}
              onDismiss={onClose}
            />
          </View>
        ) : suggestions.length === 0 ? (
          <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
            <Text style={{ fontSize: 36, marginBottom: spacing.md }}>👥</Text>
            <Text
              style={[
                text.body.md,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontFamily: 'Outfit-Regular',
                  marginBottom: spacing.lg,
                },
              ]}
            >
              None of your contacts are on apna yet. Invite them!
            </Text>
            <Pressable
              onPress={shareInviteLink}
              style={[styles.inviteBtn, { backgroundColor: colors.accentPrimary, borderRadius: 22 }]}
              accessibilityRole="button"
              accessibilityLabel="Share invite link"
            >
              <Text style={[text.label.md, { color: colors.bgPrimary, fontFamily: 'Outfit-Bold' }]}>
                Share Invite Link
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={flatListData}
            keyExtractor={(item, index) => (item.user ? item.user.uid : `header-${index}`)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <Text
                    style={[
                      text.label.sm,
                      {
                        color: colors.textMuted,
                        fontFamily: 'Outfit-Medium',
                        fontSize: 11,
                        marginTop: spacing.md,
                        marginBottom: spacing.xs,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                )
              }
              if (item.user) {
                return (
                  <ContactSuggestionRow
                    user={item.user}
                    isAlreadyMember={item.user.isAlreadyMember}
                    onAdd={() => onAddMember(item.user!)}
                  />
                )
              }
              return null
            }}
          />
        )}
      </View>

      {/* Footer */}
      {hasPermission && suggestions.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              paddingBottom: layout.safeAreaBottom + spacing.sm,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <Text style={[text.label.sm, { color: colors.textMuted, fontSize: 11 }]}>
            {totalContactsScanned} contacts scanned · {minutesAgoStr}
          </Text>
        </View>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    minHeight: 250,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
  },
  skeletonDetails: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonName: {
    width: '60%',
    height: 14,
  },
  skeletonPhone: {
    width: '40%',
    height: 10,
  },
  skeletonButton: {
    width: 60,
    height: 32,
  },
})
