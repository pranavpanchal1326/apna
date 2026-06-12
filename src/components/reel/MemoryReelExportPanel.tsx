// src/components/reel/MemoryReelExportPanel.tsx
// Export progress, cancellation, and share controls for memory reels.

import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '@theme'
import { Button } from '@components'
import type { ReelExportProgress, ReelPlan } from '@lib/reel/types'

interface MemoryReelExportPanelProps {
  plan: ReelPlan | null
  progress: ReelExportProgress
  isExporting: boolean
  outputUri: string | null
  errorMessage: string | null
  onStartExport: () => void
  onCancelExport: () => void
  onShare: () => void
  onRetry: () => void
}

export function MemoryReelExportPanel({
  plan,
  progress,
  isExporting,
  outputUri,
  errorMessage,
  onStartExport,
  onCancelExport,
  onShare,
  onRetry,
}: MemoryReelExportPanelProps) {
  const { colors, text, spacing, radius } = useTheme()

  if (!plan) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderRadius: radius.lg, borderColor: colors.border, padding: spacing.lg }]}>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Memory reel</Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          Add photo memories to your trip to create a shareable reel.
        </Text>
      </View>
    )
  }

  const showProgress = isExporting && progress.phase !== 'idle' && progress.phase !== 'completed'

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderRadius: radius.lg, borderColor: colors.border, padding: spacing.lg }]}>
      <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Memory reel</Text>
      <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md }]}>
        {plan.memoryCount} moments · ~{Math.round(plan.totalDurationMs / 1000)}s · vertical MP4
      </Text>

      {showProgress ? (
        <View style={{ marginBottom: spacing.md }}>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress.progress * 100)}%`,
                  backgroundColor: colors.accentPrimary,
                  borderRadius: radius.full,
                },
              ]}
            />
          </View>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {progress.message}
          </Text>
          <Pressable onPress={onCancelExport} style={{ marginTop: spacing.sm }}>
            <Text style={[text.label.md, { color: colors.accentDanger }]}>Cancel export</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={[text.body.sm, { color: colors.negative, marginBottom: spacing.md }]}>
          {errorMessage}
        </Text>
      ) : null}

      {progress.phase === 'completed' && outputUri ? (
        <Text style={[text.body.sm, { color: colors.positive, marginBottom: spacing.md }]}>
          Reel ready — share it to WhatsApp or Instagram.
        </Text>
      ) : null}

      {outputUri && !isExporting ? (
        <Button variant="primary" label="Share reel" fullWidth onPress={onShare} style={{ marginBottom: spacing.sm }} />
      ) : null}

      {!isExporting ? (
        <Button
          variant={outputUri ? 'secondary' : 'primary'}
          label={outputUri ? 'Create new reel' : 'Export memory reel'}
          fullWidth
          onPress={errorMessage ? onRetry : onStartExport}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
})
