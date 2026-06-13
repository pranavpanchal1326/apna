import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, ActivityIndicator } from 'react-native'
import { useTheme } from '@theme'
import type { MatchedUser } from '../../lib/contacts/cache'
import * as Haptics from 'expo-haptics'

interface ContactSuggestionRowProps {
  user: MatchedUser
  onAdd(): void | Promise<void>
  isAlreadyMember: boolean
}

export function ContactSuggestionRow({
  user,
  onAdd,
  isAlreadyMember,
}: ContactSuggestionRowProps) {
  const { colors, radius, text } = useTheme()
  
  const [isAdding, setIsAdding] = useState(false)
  
  const slideAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(1)).current

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const handleAdd = () => {
    if (isAdding) return
    setIsAdding(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Run slide out left animation before calling parent addition
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -400,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      try {
        await onAdd()
      } catch (err) {
        // Reset animation and spinner on error
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAdding(false)
        })
      }
    })
  }

  return (
    <Animated.View
      style={[
        styles.row,
        {
          height: 64,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: Avatar Circle */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: user.avatarColor || colors.accentPrimary,
            borderRadius: radius.full,
          },
        ]}
      >
        <Text style={[styles.avatarText, { color: '#FFF', fontFamily: 'Outfit-Bold' }]}>
          {initials}
        </Text>
      </View>

      {/* Center: Name & Masked Phone */}
      <View style={styles.center}>
        <Text
          style={[
            text.body.sm,
            {
              color: colors.textPrimary,
              fontFamily: 'Outfit-Medium',
              fontSize: 14,
            },
          ]}
          numberOfLines={1}
        >
          {user.name}
        </Text>
        <Text
          style={[
            text.mono.sm,
            {
              color: colors.textSecondary,
              fontSize: 12,
              marginTop: 2,
            },
          ]}
        >
          {user.phone}
        </Text>
      </View>

      {/* Right Action */}
      <View style={styles.right}>
        {isAlreadyMember ? (
          <View style={[styles.badge, { backgroundColor: colors.border, borderRadius: radius.full }]}>
            <Text style={[text.label.sm, { color: colors.textMuted, fontSize: 11 }]}>
              Already in group
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleAdd}
            disabled={isAdding}
            style={[
              styles.addBtn,
              {
                borderColor: colors.accentPrimary,
                borderRadius: radius.full,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${user.name} to group`}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.accentPrimary} />
            ) : (
              <Text
                style={[
                  text.label.sm,
                  {
                    color: colors.accentPrimary,
                    fontFamily: 'Outfit-Bold',
                    fontSize: 12,
                  },
                ]}
              >
                Add
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
  },
  center: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 32,
  },
})
