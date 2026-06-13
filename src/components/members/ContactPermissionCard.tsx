import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'

interface ContactPermissionCardProps {
  onRequestPermission(): void
  onDismiss(): void
}

export function ContactPermissionCard({
  onRequestPermission,
  onDismiss,
}: ContactPermissionCardProps) {
  const { colors, spacing, radius, text } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left: contacts icon */}
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 24, color: colors.accentPrimary }}>👥</Text>
        </View>

        {/* Right: details */}
        <View style={styles.details}>
          <Text
            style={[
              text.label.lg,
              {
                color: colors.textPrimary,
                fontFamily: 'Outfit-Medium',
                fontSize: 14,
              },
            ]}
          >
            Find friends on apna
          </Text>
          <Text
            style={[
              text.body.sm,
              {
                color: colors.textSecondary,
                fontFamily: 'Outfit-Regular',
                fontSize: 12,
                marginTop: 2,
              },
            ]}
          >
            Allow contacts access to see which friends are already here.
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={[styles.actions, { marginTop: spacing.md }]}>
        <Pressable
          onPress={onDismiss}
          style={styles.textBtn}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text
            style={[
              text.label.sm,
              {
                color: colors.textMuted,
                fontFamily: 'Outfit-Medium',
              },
            ]}
          >
            Not now
          </Text>
        </Pressable>

        <Pressable
          onPress={onRequestPermission}
          style={[styles.primaryBtn, { backgroundColor: colors.accentPrimary + '15', borderRadius: radius.sm }]}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Allow access"
        >
          <Text
            style={[
              text.label.sm,
              {
                color: colors.accentPrimary,
                fontFamily: 'Outfit-Bold',
              },
            ]}
          >
            Allow access
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  textBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
})
