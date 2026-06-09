// src/screens/profile/ProfileScreen.tsx
import { useCallback } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Screen, Avatar, Button } from '@components'
import { useTheme } from '@theme'
import { useAuth } from '@hooks/useAuth'
import { track, resetAnalyticsUser } from '@lib/analytics'
import { clearSentryUser } from '@lib/sentry'

import { removePushToken } from '@lib/notifications'

export function ProfileScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const { user, logout, isLoading } = useAuth()

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
