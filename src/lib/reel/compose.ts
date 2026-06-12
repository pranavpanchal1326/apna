// src/lib/reel/compose.ts
// FFmpeg filter composition — timing, transitions, scale/pad.

import { REEL_OUTPUT, getReelTiming } from './config'
import type { ReelPlan } from './types'
import { buildAudioInputArg } from './audio'
import type { ReelAudioTrack } from './audio'

function toFfmpegPath(uri: string): string {
  return uri.replace(/^file:\/\//, '').replace(/\\/g, '/')
}

function scalePadFilter(index: number): string {
  const { width, height } = REEL_OUTPUT
  return `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x080C14,format=yuv420p,fps=${REEL_OUTPUT.fps}[v${index}]`
}

function buildXfadeChain(
  clipCount: number,
  durationsSec: number[],
  transitionSec: number,
): string {
  if (clipCount === 1) {
    return '[v0]copy[vout]'
  }

  let filter = ''
  let current = 'v0'
  let offset = durationsSec[0] - transitionSec

  for (let i = 1; i < clipCount; i++) {
    const out = i === clipCount - 1 ? 'vout' : `vx${i}`
    filter += `[${current}][v${i}]xfade=transition=fade:duration=${transitionSec}:offset=${Math.max(0, offset).toFixed(2)}[${out}];`
    current = out
    offset += durationsSec[i] - transitionSec
  }

  return filter.slice(0, -1)
}

export function buildFfmpegCommand(params: {
  plan: ReelPlan
  framePaths: string[]
  outputPath: string
  audioTrack?: ReelAudioTrack | null
}): string {
  const { plan, framePaths, outputPath, audioTrack } = params
  const timing = getReelTiming(plan.template)
  const transitionSec = timing.transitionDurationMs / 1000

  const inputs = framePaths
    .map((path, index) => {
      const durationSec = (plan.clips[index]?.durationMs ?? 2500) / 1000
      return `-loop 1 -t ${durationSec.toFixed(2)} -i "${toFfmpegPath(path)}"`
    })
    .join(' ')

  const scaleFilters = framePaths.map((_, index) => scalePadFilter(index)).join(';')
  const durationsSec = plan.clips.map((c) => c.durationMs / 1000)
  const xfade = buildXfadeChain(framePaths.length, durationsSec, transitionSec)

  const videoInputCount = framePaths.length
  const audioInput = audioTrack ? buildAudioInputArg(audioTrack) : ''
  const audioMap = audioTrack
    ? `-map "[vout]" -map ${videoInputCount}:a -c:a aac -b:a 128k -shortest`
    : `-map "[vout]"`

  const filterComplex = `${scaleFilters};${xfade}`

  return [
    '-y',
    inputs,
    audioInput,
    `-filter_complex "${filterComplex}"`,
    audioMap,
    `-c:v libx264 -b:v ${REEL_OUTPUT.videoBitrate} -pix_fmt ${REEL_OUTPUT.pixelFormat}`,
    `"${toFfmpegPath(outputPath)}"`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function estimateRenderProgress(
  phase: 'preparing' | 'rendering' | 'finalizing',
  clipIndex: number,
  clipTotal: number,
  ffmpegRatio?: number,
): number {
  if (phase === 'preparing') {
    return Math.min(0.35, (clipIndex / Math.max(clipTotal, 1)) * 0.35)
  }
  if (phase === 'rendering') {
    return 0.35 + (ffmpegRatio ?? 0.5) * 0.55
  }
  return 0.95
}
