// src/screens/hangouts/components/RsvpBar.tsx
// Three-button RSVP bar — Yes / Maybe / No.
// Shows current vote with accent, supports optimistic switching.

import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../../theme'
import type { RsvpValue } from '../../../lib/schemas/hangout.schema'

interface RsvpConfig {
  value:   RsvpValue
  label:   string
  emoji:   string
  colorFn: (colors: ReturnType<typeof useTheme>['colors']) => string
}

const RSVP_OPTIONS: RsvpConfig[] = [
  { value: 'yes',   label: 'Yes',   emoji: '✓',  colorFn: (c) => c.positive        },
  { value: 'maybe', label: 'Maybe', emoji: '?',  colorFn: (c) => c.accentGold      },
  { value: 'no',    label: 'No',    emoji: '✕',  colorFn: (c) => c.accentDanger    },
]

interface Props {
  current?:   RsvpValue | null
  onVote:     (value: RsvpValue) => Promise<void>
  isPending?: boolean
  disabled?:  boolean
  size?:      'sm' | 'lg'
}

export function RsvpBar({ current, onVote, isPending, disabled, size = 'lg' }: Props) {
  const { colors, text, radius } = useTheme()

  const handleVote = async (value: RsvpValue) => {
    if (isPending || disabled) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await onVote(value)
  }

  const isSmall = size === 'sm'

  return (
    <View style={styles.row}>
      {RSVP_OPTIONS.map((opt) => {
        const isActive = current === opt.value
        const accent   = opt.colorFn(colors)
        return (
          <Pressable
            key={opt.value}
            onPress={() => handleVote(opt.value)}
            disabled={isPending || disabled}
            style={[
              styles.btn,
              {
                flex:            1,
                backgroundColor: isActive ? accent + '22' : colors.bgTertiary,
                borderColor:     isActive ? accent         : colors.border,
                borderWidth:     isActive ? 1.5            : 1,
                borderRadius:    radius.md,
                paddingVertical: isSmall ? 8 : 12,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={`RSVP ${opt.label}`}
          >
            {isPending && isActive ? (
              <ActivityIndicator color={accent} size={isSmall ? 12 : 16} />
            ) : (
              <>
                <Text style={{ fontSize: isSmall ? 14 : 18, color: isActive ? accent : colors.textMuted }}>
                  {opt.emoji}
                </Text>
                <Text style={[isSmall ? text.label.sm : text.label.md, {
                  color:      isActive ? accent : colors.textMuted,
                  fontFamily: 'Outfit-SemiBold',
                  marginTop:  2,
                }]}>
                  {opt.label}
                </Text>
              </>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           8,
  },
  btn: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
})
