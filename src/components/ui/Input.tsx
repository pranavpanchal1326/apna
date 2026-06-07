// src/components/ui/Input.tsx
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

    const borderColor = error
      ? colors.accentDanger
      : isFocused
      ? colors.accentPrimary
      : colors.border

    // ── Keyboard + type config ─────────────────────────────────
    const typeConfig: Partial<TextInputProps> =
      type === 'phone'
        ? {
            keyboardType: 'phone-pad',
            maxLength: 10,
            returnKeyType: 'done',
          }
        : type === 'amount'
        ? {
            keyboardType: 'numeric',
            returnKeyType: 'done',
          }
        : {
            keyboardType: 'default',
            returnKeyType: 'next',
          }

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              text.label.md,
              {
                color: error ? colors.accentDanger : colors.textSecondary,
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
              borderColor,
              borderRadius: radius.md,
              opacity: disabled ? 0.4 : 1,
              borderWidth: isFocused ? 1.5 : 1,
            },
          ]}
        >
          {/* Phone prefix */}
          {type === 'phone' && (
            <View
              style={[
                styles.prefix,
                {
                  borderRightColor: colors.border,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Text style={[text.body.md, { color: colors.textSecondary }]}>
                +91
              </Text>
            </View>
          )}

          {/* Amount prefix */}
          {type === 'amount' && (
            <View style={[styles.prefix, { paddingLeft: spacing.md }]}>
              <Text
                style={[
                  text.mono.md,
                  { color: colors.textSecondary },
                ]}
              >
                ₹
              </Text>
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
                fontSize: type === 'amount' ? 20 : 15,
                paddingHorizontal: type === 'text' ? spacing.md : spacing.sm,
                paddingVertical: spacing.md,
                flex: 1,
              },
            ]}
            {...typeConfig}
            {...rest}
          />
        </View>

        {/* Error / hint text */}
        {(error || hint) && (
          <Text
            style={[
              text.label.sm,
              {
                color: error ? colors.accentDanger : colors.textMuted,
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
    borderRightWidth: 1,
    alignSelf: 'stretch',
    paddingVertical: 0,
  },
  input: {
    minHeight: 52,
    textAlignVertical: 'center',
  },
})
