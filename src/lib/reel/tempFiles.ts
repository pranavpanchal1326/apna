// src/lib/reel/tempFiles.ts
// Reel export temp file tracking and cleanup.

import * as FileSystem from 'expo-file-system/legacy'
import { captureError } from '@lib/sentry'

const REEL_DIR = `${FileSystem.cacheDirectory}apna-reel-exports/`
const JOB_TTL_MS = 2 * 60 * 60 * 1000

const activeJobs = new Map<string, string[]>()

export function createReelJobId(groupId: string): string {
  return `reel-${groupId}-${Date.now()}`
}

export async function ensureReelWorkDir(jobId: string): Promise<string> {
  const dir = `${REEL_DIR}${jobId}/`
  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
  return dir
}

export function trackReelTempFile(jobId: string, uri: string): void {
  const files = activeJobs.get(jobId) ?? []
  files.push(uri)
  activeJobs.set(jobId, files)
}

export async function cleanupReelJob(jobId: string): Promise<void> {
  const dir = `${REEL_DIR}${jobId}/`
  try {
    await FileSystem.deleteAsync(dir, { idempotent: true })
    activeJobs.delete(jobId)
  } catch (err) {
    captureError(err, { source: 'reel.tempFiles.cleanupReelJob', jobId })
  }
}

export function buildReelWorkOutputPath(workDir: string): string {
  return `${workDir}output.mp4`
}

export function buildReelFinalOutputPath(jobId: string, tripName: string): string {
  const safeName = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'trip'
  return `${REEL_DIR}${safeName}-${jobId}.mp4`
}

export async function hasEnoughStorage(estimatedBytes = 80 * 1024 * 1024): Promise<boolean> {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync()
    return free > estimatedBytes
  } catch {
    return true
  }
}

export async function cleanStaleReelExports(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(REEL_DIR)
    if (!dirInfo.exists) return

    const jobs = await FileSystem.readDirectoryAsync(REEL_DIR)
    const now = Date.now()

    for (const jobFolder of jobs) {
      const jobPath = `${REEL_DIR}${jobFolder}/`
      const info = await FileSystem.getInfoAsync(jobPath)
      if (!info.exists || !info.modificationTime) continue
      const ageMs = now - info.modificationTime * 1000
      if (ageMs > JOB_TTL_MS) {
        await FileSystem.deleteAsync(jobPath, { idempotent: true })
      }
    }
  } catch (err) {
    captureError(err, { source: 'reel.tempFiles.cleanStaleReelExports' })
  }
}
