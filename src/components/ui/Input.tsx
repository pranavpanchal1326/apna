// src/components/ui/Input.tsx
// Kora & Ink Input — Blueprint §3.6. Borderless bgTertiary field, radius.soft,
// 52pt. Focus state: a stitch sews along the bottom edge (left→right, 240ms)
// in madder — the focus ring IS the thread. Error: stitch re-sews in haldi +
// bodySm message below; never red borders around the whole field. Amount
// inputs use mono at monoLg with the rupee prefix pre-rendered in textMuted.

import { useState, useCallback, forwardRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@theme'
import { Stitch } from './Stitch'

export type InputType = 'text' | 'phone' | 'amount'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  type?: InputType
  error?: string
  hint?: string
  containerStyle?: ViewStyle
  disabled?: boolean
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      type = 'text',
      error,
      hint,
      containerStyle,
      disabled = false,
      onFocus,
      onBlur,
      value,
      ...rest
    },
    ref
  ) => {
    const { colors, spacing, radius, text, fonts } = useTheme()
    const [isFocused, setIsFocused] = useState(false)

    const handleFocus = useCallback(
      (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
        setIsFocused(true)
        onFocus?.(e)
      },
      [onFocus]
    )

    const handleBlur = useCallback(
      (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
        setIsFocused(false)
        onBlur?.(e)
      },
      [onBlur]
    )

    // The focus ring IS the thread: show the bottom stitch when focused or
    // errored. Error re-sews in haldi (warning); focus sews in madder.
    const showStitch = isFocused || !!error
    const stitchColor = error ? colors.warning : colors.stitch

    const typeConfig: Partial<TextInputProps> =
      type === 'phone'
        ? { keyboardType: 'phone-pad', maxLength: 10, returnKeyType: 'done' }
        : type === 'amount'
        ? { keyboardType: 'numeric', returnKeyType: 'done' }
        : { keyboardType: 'default', returnKeyType: 'next' }

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              text.label.md,
              {
                color: error ? colors.warning : colors.textSecondary,
                marginBottom: spacing.xs,
              },
            ]}
          >
            {label}
          </Text>
        )}

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.soft,
              opacity: disabled ? 0.4 : 1,
            },
          ]}
        >
          {/* Phone prefix */}
          {type === 'phone' && (
            <View style={[styles.prefix, { paddingHorizontal: spacing.md }]}>
              <Text style={[text.body.md, { color: colors.textSecondary }]}>+91</Text>
            </View>
          )}

          {/* Amount prefix — rupee whispers in textMuted (§3.6) */}
          {type === 'amount' && (
            <View style={[styles.prefix, { paddingLeft: spacing.md }]}>
              <Text style={[text.mono.lg, { color: colors.textMuted }]}>₹</Text>
            </View>
          )}

          <TextInput
            ref={ref}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accentPrimary}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                fontFamily: type === 'amount' ? fonts.mono : fonts.body,
                fontSize: type === 'amount' ? 26 : 15,
                paddingHorizontal: type === 'text' ? spacing.md : spacing.sm,
                paddingVertical: spacing.md,
                flex: 1,
              },
            ]}
            {...typeConfig}
            {...rest}
          />

          {/* Focus / error stitch sews along the bottom edge */}
          {showStitch && (
            <View style={styles.focusStitch} pointerEvents="none">
              <Stitch sew color={stitchColor} />
            </View>
          )}
        </View>

        {(error || hint) && (
          <Text
            style={[
              text.body.sm,
              {
                color: error ? colors.warning : colors.textMuted,
                marginTop: spacing.xs,
              },
            ]}
          >
            {error ?? hint}
          </Text>
        )}
      </View>
    )
  }
)

Input.displayName = 'Input'

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    overflow: 'hidden',
  },
  prefix: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 0,
  },
  input: {
    minHeight: 52,
    textAlignVertical: 'center',
  },
  focusStitch: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },
})
