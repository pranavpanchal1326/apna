import React from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTheme } from '../../theme'

interface UploadProgressChipProps {
  state: 'idle' | 'compressing' | 'uploading' | 'done' | 'error' | 'queued'
  progress?: number     // 0–100 for uploading state
  onRetry?: () => void  // shown in error state
}

export function UploadProgressChip({
  state,
  progress = 0,
  onRetry,
}: UploadProgressChipProps) {
  const { colors, text, radius } = useTheme()

  if (state === 'idle') return null

  let bgColor: string = colors.bgSecondary
  let borderColor: string = colors.border
  let textColor: string = colors.textPrimary
  let labelText = ''
  let IconComponent: React.ReactNode = null
  let isInteractive = false

  switch (state) {
    case 'compressing':
      labelText = 'Compressing…'
      textColor = colors.textSecondary
      IconComponent = <ActivityIndicator size="small" color={colors.textSecondary} style={styles.spinner} />
      break
    case 'uploading':
      labelText = `Uploading ${progress}%`
      textColor = colors.textPrimary
      IconComponent = <ActivityIndicator size="small" color={colors.accentPrimary} style={styles.spinner} />
      break
    case 'done':
      bgColor = colors.positive + '15'
      borderColor = colors.positive
      textColor = colors.positive
      labelText = 'Uploaded'
      IconComponent = <Text style={[styles.icon, { color: colors.positive }]}>✓</Text>
      break
    case 'error':
      bgColor = colors.accentDanger + '15'
      borderColor = colors.accentDanger
      textColor = colors.accentDanger
      labelText = 'Failed · Retry'
      IconComponent = <Text style={[styles.icon, { color: colors.accentDanger }]}>×</Text>
      isInteractive = true
      break
    case 'queued':
      bgColor = colors.bgTertiary
      textColor = colors.textMuted
      labelText = 'Queued'
      IconComponent = <Text style={[styles.icon, { color: colors.textMuted }]}>🕒</Text>
      break
  }

  const renderContent = () => (
    <View style={styles.contentRow}>
      {IconComponent}
      <Text style={[text.label.sm, { color: textColor, fontWeight: '700' }]}>
        {labelText}
      </Text>
    </View>
  )

  if (isInteractive && onRetry) {
    return (
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: bgColor,
            borderColor,
            borderRadius: radius.full,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        accessibilityLabel="Retry failed upload"
        accessibilityRole="button"
      >
        {renderContent()}
      </Pressable>
    )
  }

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: radius.full,
        },
      ]}
    >
      {renderContent()}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    height: 28,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 6,
    transform: [{ scale: 0.8 }],
  },
  icon: {
    fontSize: 12,
    marginRight: 6,
    fontWeight: '700',
  },
})
