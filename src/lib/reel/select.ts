// src/lib/reel/select.ts
// Deterministic reel selection — reacted memories, day diversity, visual spread.

import type { MemoryInput } from '@lib/schemas'
import type { GroupInput } from '@lib/schemas'
import { getTripDayNumber } from '@lib/utils/tripWrapData'
import { getReelTiming } from './config'
import type { ReelClip, ReelPlan, ReelTemplate } from './types'

function scoreMemory(memory: MemoryInput): number {
  let score = 0
  if (memory.reactions) score += Object.keys(memory.reactions).length * 2
  if (memory.caption?.trim()) score += 2
  if (memory.photoUrl || memory.photoThumb) score += 5
  return score
}

function sanitizeCaption(caption?: string): string | undefined {
  if (!caption) return undefined
  const trimmed = caption.trim()
  if (trimmed.length < 3 || trimmed.length > 60) return undefined
  if (/[@#]/.test(trimmed)) return undefined
  return trimmed
}

function clipDurationFromCaption(caption: string | undefined, timing: ReturnType<typeof getReelTiming>): number {
  const words = caption ? caption.split(/\s+/).length : 0
  const base = timing.minClipDurationMs + words * 120
  return Math.min(timing.maxClipDurationMs, Math.max(timing.minClipDurationMs, base))
}

export function selectReelMemories(
  memories: MemoryInput[],
  _startDate: string | undefined,
  maxClips: number,
): MemoryInput[] {
  const withPhotos = memories.filter((m) => m.photoUrl || m.photoThumb)
  if (withPhotos.length === 0) return []

  const scored = withPhotos.map((m) => ({ memory: m, score: scoreMemory(m) }))
  const byDate: Record<string, typeof scored> = {}

  scored.forEach((item) => {
    const d = item.memory.date
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(item)
  })

  const dayPicks: typeof scored = []
  Object.values(byDate).forEach((group) => {
    group.sort((a, b) => b.score - a.score)
    dayPicks.push(group[0])
  })

  dayPicks.sort((a, b) => a.memory.date.localeCompare(b.memory.date))

  const selectedIds = new Set<string>()
  const selected: MemoryInput[] = []

  for (const item of dayPicks) {
    if (selected.length >= maxClips) break
    selected.push(item.memory)
    selectedIds.add(item.memory.id)
  }

  if (selected.length < maxClips) {
    const remaining = scored
      .filter((item) => !selectedIds.has(item.memory.id))
      .sort((a, b) => b.score - a.score)

    for (const item of remaining) {
      if (selected.length >= maxClips) break
      selected.push(item.memory)
    }
  }

  return selected.sort((a, b) => a.date.localeCompare(b.date))
}

export function buildReelPlan(params: {
  group: GroupInput
  memories: MemoryInput[]
  template?: ReelTemplate
  dateRange?: string
}): ReelPlan | null {
  const { group, memories, template = 'default', dateRange } = params
  const timing = getReelTiming(template)

  const selected = selectReelMemories(memories, group.startDate, timing.maxClips)
  if (selected.length === 0) return null

  const memoryClips: ReelClip[] = selected.map((memory) => {
    const caption = sanitizeCaption(memory.caption)
    const day = getTripDayNumber(memory.date, group.startDate)
    return {
      id: `memory-${memory.id}`,
      type: 'memory',
      remoteUrl: memory.photoThumb || memory.photoUrl,
      durationMs: clipDurationFromCaption(caption, timing),
      day,
      caption,
      overlayText: caption ? `Day ${day}` : `Day ${day}`,
      memoryId: memory.id,
    }
  })

  const rangeLabel =
    dateRange ??
    (group.startDate
      ? `${group.startDate}${group.endDate ? ` to ${group.endDate}` : ''}`
      : 'Trip memories')

  const titleClip: ReelClip = {
    id: 'title',
    type: 'title',
    durationMs: timing.titleDurationMs,
    overlayText: group.destination ?? group.name,
  }

  const closingClip: ReelClip = {
    id: 'closing',
    type: 'closing',
    durationMs: timing.closingDurationMs,
    overlayText: 'Made with apna',
  }

  const clips = [titleClip, ...memoryClips, closingClip]
  const transitionOverlap =
    Math.max(0, clips.length - 1) * timing.transitionDurationMs
  const totalDurationMs = clips.reduce((sum, c) => sum + c.durationMs, 0) - transitionOverlap

  return {
    id: `reel-${group.id}-${template}`,
    groupId: group.id,
    tripName: group.name,
    destination: group.destination,
    dateRange: rangeLabel,
    coverEmoji: group.coverEmoji,
    clips,
    totalDurationMs: Math.min(totalDurationMs, timing.maxTotalDurationMs),
    template,
    memoryCount: selected.length,
    context: group.startDate && group.endDate ? 'trip' : 'group',
  }
}
