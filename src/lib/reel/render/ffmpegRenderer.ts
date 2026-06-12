// src/lib/reel/render/ffmpegRenderer.ts
// FFmpeg render layer — isolated native dependency with graceful unavailability.

import { buildFfmpegCommand } from '../compose'
import type { ReelPlan } from '../types'
import type { ReelAudioTrack } from '../audio'

type FFmpegSession = {
  getReturnCode: () => Promise<{ isValueSuccess: () => boolean }>
  cancel: () => Promise<void>
}

type FFmpegKitType = {
  execute: (command: string) => Promise<FFmpegSession>
  cancel: () => Promise<void>
}

let ffmpegKit: FFmpegKitType | null | undefined

function loadFfmpegKit(): FFmpegKitType | null {
  if (ffmpegKit !== undefined) return ffmpegKit
  try {
    const mod = require('ffmpeg-kit-react-native') as { FFmpegKit: FFmpegKitType }
    ffmpegKit = mod.FFmpegKit
    return ffmpegKit
  } catch {
    ffmpegKit = null
    return null
  }
}

export function isFfmpegRendererAvailable(): boolean {
  return loadFfmpegKit() !== null
}

export async function renderReelWithFfmpeg(params: {
  plan: ReelPlan
  framePaths: string[]
  outputPath: string
  audioTrack?: ReelAudioTrack | null
  onProgress?: (ratio: number) => void
  isCancelled?: () => boolean
}): Promise<{ success: boolean; error?: string }> {
  const kit = loadFfmpegKit()
  if (!kit) {
    return { success: false, error: 'renderer_unavailable' }
  }

  if (params.isCancelled?.()) {
    return { success: false, error: 'cancelled' }
  }

  const command = buildFfmpegCommand({
    plan: params.plan,
    framePaths: params.framePaths,
    outputPath: params.outputPath,
    audioTrack: params.audioTrack,
  })

  params.onProgress?.(0.1)

  const session = await kit.execute(command)

  if (params.isCancelled?.()) {
    await session.cancel()
    await kit.cancel()
    return { success: false, error: 'cancelled' }
  }

  params.onProgress?.(0.85)

  const returnCode = await session.getReturnCode()
  if (!returnCode.isValueSuccess()) {
    return { success: false, error: 'render_failed' }
  }

  params.onProgress?.(1)
  return { success: true }
}
