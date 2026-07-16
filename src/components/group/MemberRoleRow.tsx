// src/components/group/MemberRoleRow.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { Avatar } from '@components/ui/Avatar'

interface MemberRoleRowProps {
  uid:              string
  name:             string
  nickname?:        string // In-group nickname — shown instead of name when set
  phone?:           string
  avatarColor:      string
  photoURL?:        string
  isAdmin:          boolean
  isSelf:           boolean
  isCreator:        boolean
  canManage:        boolean
  canDemote?:       boolean // Viewer is the creator — may remove admin access
  onTransferAdmin?: () => void
  onDemoteAdmin?:   () => void
  onEditNickname?:  () => void
  onRemove?:        () => void
}

export function MemberRoleRow({
  name,
  nickname,
  phone,
  avatarColor,
  photoURL,
  isAdmin,
  isSelf,
  isCreator,
  canManage,
  canDemote = false,
  onTransferAdmin,
  onDemoteAdmin,
  onEditNickname,
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
              {nickname ?? name} {isSelf && '(you)'}
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
          {nickname && (
            <Text style={[text.label.sm, { color: colors.textMuted }]} numberOfLines={1}>
              {name}
            </Text>
          )}
          {phone && <Text style={[text.label.sm, { color: colors.textMuted }]}>{phone}</Text>}
        </View>
      </View>

      {/* Nickname — any member can edit */}
      {onEditNickname && (
        <Pressable
          onPress={onEditNickname}
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderColor:     colors.border,
              borderRadius:    radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical:   4,
              marginRight:       8,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Edit nickname for ${name}`}
        >
          <Text style={[text.label.sm, { color: colors.textSecondary, fontSize: 11 }]}>Nickname</Text>
        </Pressable>
      )}

      {/* Admin Actions */}
      {canManage && !isSelf && (
        <View style={styles.actions}>
          {isAdmin && !isCreator && canDemote && onDemoteAdmin && (
            <Pressable
              onPress={onDemoteAdmin}
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
              accessibilityLabel={`Remove admin access for ${name}`}
            >
              <Text style={[text.label.sm, { color: colors.textPrimary, fontSize: 11 }]}>Remove Admin</Text>
            </Pressable>
          )}
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
