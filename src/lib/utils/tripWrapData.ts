// src/lib/utils/tripWrapData.ts
import { createMMKV } from 'react-native-mmkv'
import type { GroupInput, UserInput, ExpenseInput, MemoryInput, ItineraryItem } from '../schemas'
import { calculateNetBalances, calculateSettlements } from './settlement'

const tripWrapStorage = createMMKV({ id: 'apna-trip-wrap' })

export interface TripWrapCategorySpend {
  category: string
  amount: number
  percentage: number
}

export interface TripWrapMemberSummary {
  uid: string
  name: string
  photoUrl?: string
  paidAmount: number
  owedAmount: number
  netBalance: number
  memoriesCount: number
}

export interface TripWrapSettlement {
  fromName: string
  toName: string
  amount: number
}

export interface TripWrapVisitedPlace {
  name: string
  lat?: number
  lng?: number
}

export interface TripWrapClip {
  memoryId: string
  photoUrl: string
  caption?: string
  durationMs: number
  day: number
}

export interface TripWrapBundle {
  groupId: string
  groupName: string
  dateRange: string
  currency: string
  totalSpend: number
  tripDays: number
  memberCount: number
  memoriesCount: number
  placesVisitedCount: number
  distanceTraveled: number
  topMemories: MemoryInput[]
  categoryBreakdown: TripWrapCategorySpend[]
  perPersonSummary: TripWrapMemberSummary[]
  settlementHighlights: TripWrapSettlement[]
  visitedPlaces: TripWrapVisitedPlace[]
  reelPlan: TripWrapClip[]
  version: number
  updatedAt: number
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Computes 1-indexed day number relative to the start of the trip.
 */
export function getTripDayNumber(dateStr: string, startDateStr?: string): number {
  if (!startDateStr) return 1
  try {
    const d = new Date(dateStr)
    const start = new Date(startDateStr)
    const diff = d.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
  } catch {
    return 1
  }
}

/**
 * Deterministically ranks and selects up to 6 memories.
 * Grouped by date to ensure chronological coverage and avoid duplicates on the same day.
 */
export function selectTopTripMemories(memories: MemoryInput[]): MemoryInput[] {
  if (memories.length === 0) return []

  const scored = memories.map((m) => {
    let score = 0
    if (m.reactions) {
      score += Object.keys(m.reactions).length
    }
    if (m.caption && m.caption.trim().length > 0) {
      score += 2
    }
    if (m.photoUrl) {
      score += 5
    }
    return { memory: m, score }
  })

  // Group by date
  const byDate: Record<string, typeof scored> = {}
  scored.forEach((item) => {
    const d = item.memory.date
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(item)
  })

  // Select best from each day
  const dayBest: typeof scored = []
  Object.values(byDate).forEach((group) => {
    group.sort((a, b) => b.score - a.score)
    dayBest.push(group[0])
  })

  dayBest.sort((a, b) => b.score - a.score)

  const selectedIds = new Set<string>()
  const selected: MemoryInput[] = []

  // Add the best from each day first
  dayBest.forEach((item) => {
    if (selected.length < 6) {
      selected.push(item.memory)
      selectedIds.add(item.memory.id)
    }
  })

  // Fill up to 6 with remaining overall best
  if (selected.length < 6) {
    const remaining = scored
      .filter((item) => !selectedIds.has(item.memory.id))
      .sort((a, b) => b.score - a.score)

    for (const item of remaining) {
      if (selected.length >= 6) break
      selected.push(item.memory)
      selectedIds.add(item.memory.id)
    }
  }

  // Sort chronologically
  return selected.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Prepares the memory reel clips ordered chronologically (up to 10 clips).
 */
export function buildTripReelPlan(memories: MemoryInput[], startDate?: string): TripWrapClip[] {
  const photoMemories = memories.filter((m) => m.photoUrl)

  const scored = photoMemories.map((m) => {
    let score = 0
    if (m.reactions) score += Object.keys(m.reactions).length
    if (m.caption && m.caption.trim().length > 0) score += 2
    return { memory: m, score }
  })

  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.memory)
    .sort((a, b) => a.date.localeCompare(b.date))

  return sorted.map((m) => {
    const day = getTripDayNumber(m.date, startDate)
    const captionWordCount = m.caption ? m.caption.split(/\s+/).length : 0
    const durationMs = Math.min(4000, Math.max(2000, 2000 + captionWordCount * 200))

    return {
      memoryId: m.id,
      photoUrl: m.photoUrl!,
      caption: m.caption,
      durationMs,
      day,
    }
  })
}

/**
 * Builds the complete deterministic data bundle for the Trip Wrap.
 */
export function buildTripWrapData(params: {
  group: GroupInput
  members: UserInput[]
  expenses: ExpenseInput[]
  memories: MemoryInput[]
  itinerary: ItineraryItem[]
}): TripWrapBundle {
  const { group, members, expenses, memories, itinerary } = params
  const currency = group.currency || 'INR'

  // 1. Trip Days
  let tripDays = 1
  if (group.startDate && group.endDate) {
    try {
      const start = new Date(group.startDate)
      const end = new Date(group.endDate)
      const diff = end.getTime() - start.getTime()
      tripDays = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
    } catch {
      tripDays = 1
    }
  }

  const dateRange = group.startDate
    ? `${group.startDate}${group.endDate ? ` to ${group.endDate}` : ''}`
    : 'No dates set'

  // 2. Spend calculations
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0)
  const paidSums: Record<string, number> = {}
  expenses.forEach((e) => {
    paidSums[e.paidBy] = (paidSums[e.paidBy] ?? 0) + e.amount
  })

  // Category totals
  const categoryTotals: Record<string, number> = {}
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
  })
  const totalForDiv = totalSpend || 1
  const categoryBreakdown: TripWrapCategorySpend[] = Object.entries(categoryTotals)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: Math.round((amt / totalForDiv) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)

  // Net balances and settlements
  const netBalances = calculateNetBalances(expenses as any, group.memberIds)
  const computedSettlements = calculateSettlements(netBalances)

  const memoriesByPerson: Record<string, number> = {}
  memories.forEach((m) => {
    memoriesByPerson[m.createdBy] = (memoriesByPerson[m.createdBy] ?? 0) + 1
  })

  const perPersonSummary: TripWrapMemberSummary[] = group.memberIds.map((uid) => {
    const member = members.find((m) => m.uid === uid)
    const netBalance = netBalances[uid] ?? 0
    const paidAmount = paidSums[uid] ?? 0
    const owedAmount = Math.max(0, paidAmount - netBalance)

    return {
      uid,
      name: member?.name ?? 'Squad Member',
      photoUrl: member?.photoUrl || undefined,
      paidAmount,
      owedAmount,
      netBalance,
      memoriesCount: memoriesByPerson[uid] ?? 0,
    }
  })

  const settlementHighlights: TripWrapSettlement[] = computedSettlements.map((s) => {
    const fromUser = members.find((m) => m.uid === s.from)
    const toUser = members.find((m) => m.uid === s.to)
    return {
      fromName: fromUser?.name ?? s.from,
      toName: toUser?.name ?? s.to,
      amount: s.amount,
    }
  })

  // 3. Places Visited & Distance Traveled
  const uniquePlaces = new Map<string, TripWrapVisitedPlace>()
  itinerary.forEach((item) => {
    if (item.isConfirmed && item.placeRef?.name) {
      uniquePlaces.set(item.placeRef.placeId || item.placeRef.name, {
        name: item.placeRef.name,
        lat: item.placeRef.lat,
        lng: item.placeRef.lng,
      })
    }
  })
  const visitedPlaces = Array.from(uniquePlaces.values())
  const placesVisitedCount = visitedPlaces.length

  // Calculate distance
  let distanceTraveled = 0
  const coords = itinerary
    .filter((item) => item.isConfirmed && item.placeRef?.lat !== undefined && item.placeRef?.lng !== undefined)
    .sort((a, b) => {
      if (a.dayId !== b.dayId) {
        return a.dayId.localeCompare(b.dayId)
      }
      return a.sortOrder - b.sortOrder
    })
    .map((item) => ({
      lat: item.placeRef!.lat,
      lng: item.placeRef!.lng,
    }))

  for (let i = 0; i < coords.length - 1; i++) {
    distanceTraveled += calculateHaversineDistance(
      coords[i].lat,
      coords[i].lng,
      coords[i + 1].lat,
      coords[i + 1].lng
    )
  }
  distanceTraveled = Math.round(distanceTraveled * 10) / 10 // 1 decimal place

  // 4. Top Memories and Reel Plan
  const topMemories = selectTopTripMemories(memories)
  const reelPlan = buildTripReelPlan(memories, group.startDate)

  return {
    groupId: group.id,
    groupName: group.name,
    dateRange,
    currency,
    totalSpend,
    tripDays,
    memberCount: group.memberIds.length,
    memoriesCount: memories.length,
    placesVisitedCount,
    distanceTraveled,
    topMemories,
    categoryBreakdown,
    perPersonSummary,
    settlementHighlights,
    visitedPlaces,
    reelPlan,
    version: 1,
    updatedAt: Date.now(),
  }
}

/**
 * Reads wrap data from local MMKV cache.
 */
export function getCachedTripWrap(groupId: string): TripWrapBundle | null {
  try {
    const raw = tripWrapStorage.getString(groupId)
    if (!raw) return null
    return JSON.parse(raw) as TripWrapBundle
  } catch (err) {
    console.warn('[tripWrapData] Failed to read from cache:', err)
    return null
  }
}

/**
 * Saves wrap data to local MMKV cache.
 */
export function cacheTripWrap(groupId: string, data: TripWrapBundle): void {
  try {
    tripWrapStorage.set(groupId, JSON.stringify(data))
  } catch (err) {
    console.warn('[tripWrapData] Failed to write to cache:', err)
  }
}

/**
 * Deletes wrap data from local MMKV cache (e.g. for regeneration).
 */
export function clearCachedTripWrap(groupId: string): void {
  try {
    tripWrapStorage.remove(groupId)
  } catch (err) {
    console.warn('[tripWrapData] Failed to delete from cache:', err)
  }
}
