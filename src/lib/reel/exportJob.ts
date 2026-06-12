// src/lib/reel/exportJob.ts
// Export job orchestration — selection → prepare → render → finalize.

import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'
import type { ReelPlan, ReelExportResult, ReelExportProgress, ReelExportPhase } from './types'
import * as FileSystem from 'expo-file-system/legacy'
import {
  createReelJobId,
  ensureReelWorkDir,
  buildReelWorkOutputPath,
  buildReelFinalOutputPath,
  cleanupReelJob,
  hasEnoughStorage,
  cleanStaleReelExports,
} from './tempFiles'
import { prepareAllClipMedia } from './download'
import { getReelAudioStrategy } from './audio'
import { renderReelWithFfmpeg, isFfmpegRendererAvailable } from './render'
import { estimateRenderProgress } from './compose'

export type ReelFrameCaptureFn = (
  clipId: string,
) => Promise<string | null>

export type ExportProgressCallback = (progress: ReelExportProgress) => void

let activeCancelFlag = false
let activeJobId: string | null = null

export function cancelActiveReelExport(): void {
  activeCancelFlag = true
}

function emit(
  onProgress: ExportProgressCallback | undefined,
  phase: ReelExportPhase,
  progress: number,
  message: string,
): void {
  onProgress?.({ phase, progress, message })
}

export async function runReelExportJob(params: {
  plan: ReelPlan
  captureFrame: ReelFrameCaptureFn
  onProgress?: ExportProgressCallback
}): Promise<ReelExportResult> {
  const { plan, captureFrame, onProgress } = params

  if (!isFfmpegRendererAvailable()) {
    track('memory_reel_export_failed', {
      reason: 'renderer_unavailable',
      memory_count: plan.memoryCount,
      context: plan.context,
    })
    return {
      success: false,
      errorCode: 'renderer_unavailable',
      errorMessage: 'Video export needs a development build with FFmpeg enabled.',
    }
  }

  const hasStorage = await hasEnoughStorage()
  if (!hasStorage) {
    track('memory_reel_export_failed', { reason: 'storage_full', memory_count: plan.memoryCount })
    return {
      success: false,
      errorCode: 'storage_full',
      errorMessage: 'Not enough storage space. Free up space and try again.',
    }
  }

  await cleanStaleReelExports()

  const jobId = createReelJobId(plan.groupId)
  activeJobId = jobId
  activeCancelFlag = false

  track('memory_reel_created', {
    memory_count: plan.memoryCount,
    template: plan.template,
    context: plan.context,
    duration_ms: plan.totalDurationMs,
  })

  track('memory_reel_export_started', {
    memory_count: plan.memoryCount,
    clip_count: plan.clips.length,
    context: plan.context,
  })

  emit(onProgress, 'queued', 0.02, 'Queued')

  try {
    emit(onProgress, 'preparing', 0.05, 'Preparing media')
    const workDir = await ensureReelWorkDir(jobId)

    const clipsWithLocal = [...plan.clips]
    for (let i = 0; i < clipsWithLocal.length; i++) {
      if (activeCancelFlag) {
        throw new Error('cancelled')
      }

      const clip = clipsWithLocal[i]
      if (clip.type === 'title' || clip.type === 'closing') {
        const captured = await captureFrame(clip.id)
        if (!captured) {
          throw new Error('missing_media')
        }
        clipsWithLocal[i] = { ...clip, localUri: captured }
      }

      emit(
        onProgress,
        'preparing',
        estimateRenderProgress('preparing', i + 1, clipsWithLocal.length),
        `Preparing clip ${i + 1} of ${clipsWithLocal.length}`,
      )
    }

    const framePaths = await prepareAllClipMedia(clipsWithLocal, workDir, jobId)

    if (activeCancelFlag) throw new Error('cancelled')

    emit(onProgress, 'rendering', 0.4, 'Rendering frames')

    const workOutputPath = buildReelWorkOutputPath(workDir)
    const finalOutputPath = buildReelFinalOutputPath(jobId, plan.tripName)
    const audioTrack = await getReelAudioStrategy().resolveTrack()

    const renderResult = await renderReelWithFfmpeg({
      plan,
      framePaths,
      outputPath: workOutputPath,
      audioTrack,
      isCancelled: () => activeCancelFlag,
      onProgress: (ratio) => {
        const progress = estimateRenderProgress('rendering', framePaths.length, framePaths.length, ratio)
        emit(onProgress, 'rendering', progress, 'Rendering video')
        track('memory_reel_export_progress', {
          progress: Math.round(progress * 100),
          memory_count: plan.memoryCount,
        })
      },
    })

    if (!renderResult.success) {
      const code =
        renderResult.error === 'cancelled'
          ? 'cancelled'
          : renderResult.error === 'renderer_unavailable'
            ? 'renderer_unavailable'
            : 'render_failed'

      if (code === 'cancelled') {
        track('memory_reel_cancelled', { memory_count: plan.memoryCount })
      } else {
        track('memory_reel_export_failed', { reason: code, memory_count: plan.memoryCount })
      }

      await cleanupReelJob(jobId)
      return {
        success: false,
        errorCode: code,
        errorMessage: userMessageForCode(code),
      }
    }

    emit(onProgress, 'finalizing', 0.96, 'Finalizing MP4')

    await FileSystem.copyAsync({ from: workOutputPath, to: finalOutputPath })
    await cleanupReelJob(jobId)

    track('memory_reel_export_completed', {
      memory_count: plan.memoryCount,
      duration_ms: plan.totalDurationMs,
      context: plan.context,
      template: plan.template,
    })

    emit(onProgress, 'completed', 1, 'Ready to share')

    return {
      success: true,
      outputUri: finalOutputPath.startsWith('file://')
        ? finalOutputPath
        : `file://${finalOutputPath}`,
      durationMs: plan.totalDurationMs,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    const code: ReelExportResult['errorCode'] =
      message === 'cancelled'
        ? 'cancelled'
        : message === 'missing_media'
          ? 'download_failed'
          : 'unknown'

    captureError(err, { source: 'reel.exportJob', jobId: activeJobId ?? '' })

    if (code === 'cancelled') {
      track('memory_reel_cancelled', { memory_count: plan.memoryCount })
    } else {
      track('memory_reel_export_failed', { reason: code, memory_count: plan.memoryCount })
    }

    if (activeJobId) {
      await cleanupReelJob(activeJobId)
    }

    return {
      success: false,
      errorCode: code,
      errorMessage: userMessageForCode(code),
    }
  } finally {
    activeJobId = null
    activeCancelFlag = false
  }
}

function userMessageForCode(code: string): string {
  switch (code) {
    case 'cancelled':
      return 'Export cancelled.'
    case 'renderer_unavailable':
      return 'Video export requires a development build with FFmpeg.'
    case 'storage_full':
      return 'Not enough storage space on your device.'
    case 'download_failed':
      return 'Some photos could not be downloaded. Check your connection and retry.'
    case 'render_failed':
      return 'Video rendering failed. Try again with fewer photos.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
