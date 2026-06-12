// src/hooks/useMemoryReelExport.ts
// Memory reel export hook — wires selection, capture refs, job, and share.

import { useCallback, useState } from 'react'
import type { View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import type { GroupInput, MemoryInput } from '@lib/schemas'
import { buildReelPlan } from '@lib/reel/select'
import {
  runReelExportJob,
  cancelActiveReelExport,
  type ExportProgressCallback,
} from '@lib/reel/exportJob'
import { shareReelMp4 } from '@lib/reel/share'
import type { ReelExportProgress, ReelPlan } from '@lib/reel/types'
import { isFfmpegRendererAvailable } from '@lib/reel/render'

const IDLE_PROGRESS: ReelExportProgress = {
  phase: 'idle',
  progress: 0,
  message: '',
}

export function useMemoryReelExport(params: {
  group: GroupInput | null | undefined
  memories: MemoryInput[]
  dateRange?: string
  titleFrameRef: React.RefObject<View | null>
  closingFrameRef: React.RefObject<View | null>
}) {
  const { group, memories, dateRange, titleFrameRef, closingFrameRef } = params

  const [progress, setProgress] = useState<ReelExportProgress>(IDLE_PROGRESS)
  const [isExporting, setIsExporting] = useState(false)
  const [outputUri, setOutputUri] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const plan: ReelPlan | null = group
    ? buildReelPlan({ group, memories, dateRange })
    : null

  const captureFrame = useCallback(
    async (clipId: string): Promise<string | null> => {
      const ref = clipId === 'title' ? titleFrameRef : clipId === 'closing' ? closingFrameRef : null
      if (!ref?.current) return null
      return captureRef(ref, { format: 'jpg', quality: 0.92 })
    },
    [titleFrameRef, closingFrameRef],
  )

  const startExport = useCallback(async () => {
    if (!plan) return

    setIsExporting(true)
    setErrorMessage(null)
    setOutputUri(null)
    setProgress({ phase: 'queued', progress: 0.02, message: 'Starting...' })

    const onProgress: ExportProgressCallback = (update) => {
      setProgress(update)
    }

    const result = await runReelExportJob({
      plan,
      captureFrame,
      onProgress,
    })

    setIsExporting(false)

    if (result.success && result.outputUri) {
      setOutputUri(result.outputUri)
      setProgress({ phase: 'completed', progress: 1, message: 'Ready to share' })
    } else {
      setErrorMessage(result.errorMessage ?? 'Export failed')
      setProgress(IDLE_PROGRESS)
    }
  }, [plan, captureFrame])

  const cancelExport = useCallback(() => {
    cancelActiveReelExport()
    setIsExporting(false)
    setProgress({ phase: 'cancelled', progress: 0, message: 'Cancelled' })
  }, [])

  const shareExport = useCallback(async () => {
    if (!outputUri || !plan) return
    await shareReelMp4(outputUri, plan)
  }, [outputUri, plan])

  const retryExport = useCallback(() => {
    setErrorMessage(null)
    setProgress(IDLE_PROGRESS)
    void startExport()
  }, [startExport])

  return {
    plan,
    progress,
    isExporting,
    outputUri,
    errorMessage,
    ffmpegAvailable: isFfmpegRendererAvailable(),
    startExport,
    cancelExport,
    shareExport,
    retryExport,
  }
}
