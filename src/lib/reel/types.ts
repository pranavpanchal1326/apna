// src/lib/reel/types.ts
// Memory reel export types — selection, composition, render, share layers.

export type ReelClipType = 'title' | 'memory' | 'closing'

export type ReelExportPhase =
  | 'idle'
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ReelTemplate = 'default' | 'short' | 'extended'

export interface ReelClip {
  id: string
  type: ReelClipType
  remoteUrl?: string
  localUri?: string
  durationMs: number
  day?: number
  caption?: string
  overlayText?: string
  memoryId?: string
}

export interface ReelPlan {
  id: string
  groupId: string
  tripName: string
  destination?: string
  dateRange: string
  coverEmoji?: string
  clips: ReelClip[]
  totalDurationMs: number
  template: ReelTemplate
  memoryCount: number
  context: 'trip' | 'group'
}

export interface ReelExportProgress {
  phase: ReelExportPhase
  progress: number
  message: string
}

export interface ReelExportResult {
  success: boolean
  outputUri?: string
  durationMs?: number
  errorCode?: ReelExportErrorCode
  errorMessage?: string
}

export type ReelExportErrorCode =
  | 'insufficient_media'
  | 'download_failed'
  | 'storage_full'
  | 'renderer_unavailable'
  | 'render_failed'
  | 'cancelled'
  | 'unknown'

export interface ReelExportJob {
  id: string
  plan: ReelPlan
  phase: ReelExportPhase
  progress: number
  message: string
  outputUri?: string
  errorCode?: ReelExportErrorCode
  cancelled: boolean
}
