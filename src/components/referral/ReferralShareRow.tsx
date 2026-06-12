// src/components/referral/ReferralShareRow.tsx
// Lightweight share entry point for settings / onboarding moments.

import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { useReferral } from '@hooks/useReferral'

interface ReferralShareRowProps {
  entryPoint: string
  groupId?: string
  groupName?: string
  compact?: boolean
}

export function ReferralShareRow({
  entryPoint,
  groupId,
  groupName,
  compact = false,
}: ReferralShareRowProps) {
  const { colors, text, spacing, radius } = useTheme()
  const { shareReferral, link } = useReferral({ groupId, groupName })

  if (!link) return null

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        void shareReferral('share_sheet', entryPoint)
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius: radius.lg,
          borderColor: colors.border,
          padding: compact ? spacing.md : spacing.lg,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
          Invite friends to apna
        </Text>
        {!compact && (
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4 }]}>
            Share your personal link — separate from group invite codes.
          </Text>
        )}
      </View>
      <Text style={{ color: colors.accentPrimary, fontSize: 18 }}>↗</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
})
