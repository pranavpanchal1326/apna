// src/lib/reel/config.ts
// Parameterized reel timing — templates adjust rhythm without rewriting renderer.

import type { ReelTemplate } from './types'

export const REEL_OUTPUT = {
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitrate: '4M',
  pixelFormat: 'yuv420p',
} as const

export interface ReelTimingConfig {
  titleDurationMs: number
  closingDurationMs: number
  minClipDurationMs: number
  maxClipDurationMs: number
  transitionDurationMs: number
  maxTotalDurationMs: number
  maxClips: number
}

const TEMPLATE_TIMINGS: Record<ReelTemplate, ReelTimingConfig> = {
  default: {
    titleDurationMs: 2500,
    closingDurationMs: 2500,
    minClipDurationMs: 2000,
    maxClipDurationMs: 3500,
    transitionDurationMs: 500,
    maxTotalDurationMs: 45000,
    maxClips: 10,
  },
  short: {
    titleDurationMs: 2000,
    closingDurationMs: 2000,
    minClipDurationMs: 1500,
    maxClipDurationMs: 2500,
    transitionDurationMs: 400,
    maxTotalDurationMs: 20000,
    maxClips: 6,
  },
  extended: {
    titleDurationMs: 3000,
    closingDurationMs: 3000,
    minClipDurationMs: 2500,
    maxClipDurationMs: 4000,
    transitionDurationMs: 600,
    maxTotalDurationMs: 60000,
    maxClips: 14,
  },
}

export function getReelTiming(template: ReelTemplate = 'default'): ReelTimingConfig {
  return TEMPLATE_TIMINGS[template]
}
