import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '@theme'

interface InviteCodeCardProps {
  code:            string
  onShare:         () => void
  onRegenerate?:   () => void
  isRegenerating?: boolean
}

export function InviteCodeCard({
  code,
  onShare,
  onRegenerate,
  isRegenerating = false,
}: InviteCodeCardProps) {
  const { colors, spacing, radius, text, shadows } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderRadius:    radius.lg,
          borderColor:     colors.borderAccent,
          borderWidth:     1,
          padding:         spacing.lg,
          ...shadows.card,
        },
      ]}
    >
      <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        INVITE CODE
      </Text>

      <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Share this code to invite people to the group.
      </Text>

      {/* Code Display */}
      <View
        style={[
          styles.codeRow,
          {
            backgroundColor: colors.bgTertiary,
            borderRadius:    radius.md,
            borderColor:     colors.border,
            borderWidth:     1,
            paddingHorizontal: spacing.lg,
            paddingVertical:   spacing.md,
            marginBottom:      spacing.md,
            alignItems:        'center',
            justifyContent:    'center',
          },
        ]}
      >
        <Text
          style={[
            text.mono.lg,
            {
              color:         colors.accentPrimary,
              fontSize:      28,
              letterSpacing: 6,
              fontWeight:    '700',
              fontFamily:    'JetBrainsMono-Bold',
            },
          ]}
        >
          {code}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onShare}
          style={[
            styles.btn,
            styles.btnPrimary,
            {
              backgroundColor: colors.accentPrimary,
              borderRadius:    radius.md,
              paddingVertical: spacing.md,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share invite code"
        >
          <Text style={[text.heading.sm, { color: colors.bgPrimary }]}>Share Invite Code</Text>
        </Pressable>

        {onRegenerate && (
          <Pressable
            onPress={onRegenerate}
            disabled={isRegenerating}
            style={[
              styles.btn,
              styles.btnSecondary,
              {
                borderColor:     colors.border,
                borderRadius:    radius.md,
                paddingVertical: spacing.md,
                marginTop:       spacing.xs,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Regenerate invite code"
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={[text.label.md, { color: colors.textSecondary }]}>↻ Regenerate Code</Text>
            )}
          </Pressable>
        )}
      </View>
      <Text style={[text.label.sm, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
        Valid for 72 hours.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card:          { overflow: 'hidden' },
  codeRow:       { flexDirection: 'row' },
  actions:       { flexDirection: 'column' },
  btn:           { alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimary:    {},
  btnSecondary:  { borderWidth: 1 },
})
