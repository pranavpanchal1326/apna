// src/components/referral/ReferralWelcomeBanner.tsx
// Subtle confirmation when referral context is recognized.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

export function ReferralWelcomeBanner() {
  const { colors, text, spacing, radius } = useTheme()

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.bgTertiary,
          borderRadius: radius.lg,
          borderColor: colors.accentPrimary,
          padding: spacing.md,
          marginBottom: spacing.lg,
        },
      ]}
    >
      <Text style={[text.label.sm, { color: colors.accentPrimary, marginBottom: 4 }]}>
        FRIEND INVITE
      </Text>
      <Text style={[text.body.sm, { color: colors.textSecondary }]}>
        You're joining through a friend's link. Finish setup and join a group to help them unlock their reward.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
  },
})
