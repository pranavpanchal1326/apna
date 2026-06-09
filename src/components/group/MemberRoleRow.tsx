// src/components/group/MemberRoleRow.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'

interface MemberRoleRowProps {
  uid:              string
  name:             string
  phone?:           string
  avatarColor:      string
  photoURL?:        string
  isAdmin:          boolean
  isSelf:           boolean
  isCreator:        boolean
  canManage:        boolean
  onTransferAdmin?: () => void
  onRemove?:        () => void
}

export function MemberRoleRow({
  name,
  phone,
  avatarColor,
  photoURL,
  isAdmin,
  isSelf,
  isCreator,
  canManage,
  onTransferAdmin,
  onRemove,
}: MemberRoleRowProps) {
  const { colors, spacing, radius, text } = useTheme()

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: spacing.md,
          borderColor:     colors.border,
          borderBottomWidth: 1,
        },
      ]}
    >
      <View style={styles.left}>
        <Avatar name={name} imageUrl={photoURL} color={avatarColor} size="md" />
        <View style={[styles.info, { marginLeft: spacing.sm }]}>
          <View style={styles.nameRow}>
            <Text style={[text.body.md, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
              {name} {isSelf && '(you)'}
            </Text>
            {isCreator && (
              <View style={[styles.badge, { backgroundColor: colors.accentGold + '22', borderColor: colors.accentGold }]}>
                <Text style={[text.label.sm, { color: colors.accentGold, fontSize: 10 }]}>Creator</Text>
              </View>
            )}
            {isAdmin && !isCreator && (
              <View style={[styles.badge, { backgroundColor: colors.accentPrimary + '22', borderColor: colors.accentPrimary }]}>
                <Text style={[text.label.sm, { color: colors.accentPrimary, fontSize: 10 }]}>Admin</Text>
              </View>
            )}
          </View>
          {phone && <Text style={[text.label.sm, { color: colors.textMuted }]}>{phone}</Text>}
        </View>
      </View>

      {/* Admin Actions */}
      {canManage && !isSelf && (
        <View style={styles.actions}>
          {!isAdmin && onTransferAdmin && (
            <Pressable
              onPress={onTransferAdmin}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.bgTertiary,
                  borderColor:     colors.border,
                  borderRadius:    radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   4,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Make ${name} admin`}
            >
              <Text style={[text.label.sm, { color: colors.textPrimary, fontSize: 11 }]}>Make Admin</Text>
            </Pressable>
          )}
          {!isCreator && onRemove && (
            <Pressable
              onPress={onRemove}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: `${colors.accentDanger}15`,
                  borderColor:     colors.accentDanger,
                  borderRadius:    radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   4,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name} from group`}
            >
              <Text style={[text.label.sm, { color: colors.accentDanger, fontSize: 11 }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info:      { flex: 1, justifyContent: 'center' },
  nameRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge:     { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5 },
  actions:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { borderWidth: 0.5 },
})
