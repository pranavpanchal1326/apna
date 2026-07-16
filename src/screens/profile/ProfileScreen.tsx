// src/screens/profile/ProfileScreen.tsx
import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '@navigation/types'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { updateDoc, deleteField } from 'firebase/firestore'
import { userDoc } from '@lib/firebase/collections'
import { isValidUpiId } from '@lib/utils/upi'
import * as Haptics from 'expo-haptics'
import { Screen, Avatar, Button } from '@components'
import { useTheme } from '@theme'
import { useAuth } from '@hooks/useAuth'
import { track, resetAnalyticsUser } from '@lib/analytics'
import { clearSentryUser } from '@lib/sentry'
import { SettingsRow } from '@components/group'
import { useHaptics } from '@hooks/useHaptics'

import { removePushToken } from '@lib/notifications'
import { deleteAccount } from '@lib/firebase/accountDeletion'
import { ReferralDashboard } from '@components/referral'

export function ProfileScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const { user, logout, isLoading } = useAuth()
  const { isEnabled, setEnabled, hasHaptics } = useHaptics()
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()

  // Payment preferences — UPI ID for one-tap settle up
  const [upiIdInput, setUpiIdInput] = useState(user?.upiId ?? '')
  const [isSavingUpi, setIsSavingUpi] = useState(false)
  const upiDirty = upiIdInput.trim() !== (user?.upiId ?? '')

  const handleSaveUpiId = useCallback(async () => {
    if (!user?.uid) return
    const trimmed = upiIdInput.trim()
    if (trimmed && !isValidUpiId(trimmed)) {
      Alert.alert('Invalid UPI ID', 'Enter it like name@bank, e.g. riya@okhdfcbank')
      return
    }
    setIsSavingUpi(true)
    try {
      await updateDoc(userDoc(user.uid), { upiId: trimmed || deleteField() } as never)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      track('upi_id_updated')
    } catch {
      Alert.alert('Error', 'Could not save your UPI ID. Please try again.')
    } finally {
      setIsSavingUpi(false)
    }
  }, [user?.uid, upiIdInput])

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, removes you from all groups, and deletes the memories you posted. Expenses stay visible to your groups as "Deleted User". This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — deletion is irreversible.
            Alert.alert(
              'Are you absolutely sure?',
              'Your phone number, profile, and photos will be permanently erased.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true)
                    try {
                      track('account_deletion_started')
                      await deleteAccount()
                      clearSentryUser()
                      resetAnalyticsUser()
                      await logout()
                    } catch {
                      setIsDeleting(false)
                      Alert.alert(
                        'Deletion failed',
                        'Something went wrong. Please check your connection and try again.'
                      )
                    }
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }, [logout])

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign out',
      'You\'ll need to verify your phone number again to sign back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            track('user_signed_out')
            clearSentryUser()
            resetAnalyticsUser()
            if (user?.uid) {
              await removePushToken(user.uid)
            }
            await logout()
          },
        },
      ]
    )
  }, [logout, user])

  if (!user) return null

  return (
    <Screen>
      {/* Avatar + name */}
      <View style={[styles.profileHeader, { marginBottom: spacing['2xl'] }]}>
        <Avatar
          name={user.name}
          color={user.avatarColor}
          size="xl"
          style={{ marginBottom: spacing.lg }}
        />
        <Text style={[text.heading.lg, { color: colors.textPrimary }]}>
          {user.name}
        </Text>
        <Text style={[text.body.md, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {user.phone}
        </Text>
      </View>

      <ReferralDashboard />

      {/* Preferences Section */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          PREFERENCES
        </Text>
        {hasHaptics && (
          <SettingsRow
            label="Haptic feedback"
            value={isEnabled}
            onToggle={setEnabled}
            description="Feel physical feedback on key actions"
          />
        )}
        <SettingsRow
          label="Notifications"
          description="Per-type alerts and silent hours"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </View>

      {/* Payments Section — UPI ID for one-tap settle up */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          PAYMENTS
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.lg,
              borderColor: colors.border,
              padding: spacing.lg,
            },
          ]}
        >
          <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            UPI ID — friends can pay you in one tap when settling up
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={upiIdInput}
              onChangeText={setUpiIdInput}
              placeholder="e.g. yourname@okhdfcbank"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                flex: 1,
                color: colors.textPrimary,
                backgroundColor: colors.bgTertiary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 15,
              }}
              accessibilityLabel="Your UPI ID"
            />
            {upiDirty && (
              <Button
                variant="primary"
                size="sm"
                label={isSavingUpi ? '…' : 'Save'}
                onPress={handleSaveUpiId}
                disabled={isSavingUpi}
              />
            )}
          </View>
        </View>
      </View>

      {/* Version info */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.lg,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Row label="Member since" value={user.createdAt
          ? new Date((user.createdAt as unknown as { seconds: number }).seconds * 1000)
              .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
          : '—'
        } colors={colors} text={text} spacing={spacing} />
        <Row label="Groups" value={String(user.groups?.length ?? 0)} colors={colors} text={text} spacing={spacing} />
        <Row label="App version" value="1.0.0" colors={colors} text={text} spacing={spacing} last />
      </View>

      {/* Sign out */}
      <Button
        variant="danger"
        size="md"
        label="Sign out"
        fullWidth
        loading={isLoading}
        onPress={handleLogout}
      />

      {/* Danger zone — permanent account deletion (GDPR / Play Store) */}
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          DANGER ZONE
        </Text>
        <Text style={[text.body.sm, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Permanently delete your account, photos, and personal data. Group expenses you were part
          of stay visible to others as “Deleted User”.
        </Text>
        <Button
          variant="secondary"
          size="md"
          label={isDeleting ? 'Deleting…' : 'Delete my account'}
          fullWidth
          disabled={isDeleting}
          loading={isDeleting}
          onPress={handleDeleteAccount}
        />
      </View>
    </Screen>
  )
}

function Row({
  label,
  value,
  colors,
  text,
  spacing,
  last = false,
}: {
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
  text: ReturnType<typeof useTheme>['text']
  spacing: ReturnType<typeof useTheme>['spacing']
  last?: boolean
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={[text.body.sm, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[text.body.sm, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
  },
  infoCard: {
    borderWidth: 1,
  },
})
