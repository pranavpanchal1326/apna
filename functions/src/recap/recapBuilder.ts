// functions/src/recap/recapBuilder.ts
// Server-side trip data aggregation for public recap generation.

import * as admin from 'firebase-admin'

const db = admin.firestore()

export interface RecapSourceBundle {
  groupId: string
  groupName: string
  destination?: string
  coverEmoji?: string
  startDate?: string
  endDate?: string
  dateRangeLabel: string
  currency: string
  status: string
  totalSpend: number
  tripDays: number
  memberCount: number
  memoriesCount: number
  placesVisitedCount: number
  topPhotoUrls: string[]
}

function tripDaysFromDates(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 1
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = end.getTime() - start.getTime()
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
  } catch {
    return 1
  }
}

function scoreMemory(data: Record<string, unknown>): number {
  let score = 0
  const reactions = data.reactions as Record<string, string> | undefined
  if (reactions) score += Object.keys(reactions).length
  const caption = data.caption as string | undefined
  if (caption?.trim()) score += 2
  if (data.photoUrl) score += 5
  return score
}

export async function buildRecapSourceBundle(groupId: string): Promise<RecapSourceBundle | null> {
  const groupSnap = await db.collection('groups').doc(groupId).get()
  if (!groupSnap.exists) return null

  const group = groupSnap.data() as Record<string, unknown>
  const memberIds = (group.memberIds as string[]) ?? []
  const startDate = group.startDate as string | undefined
  const endDate = group.endDate as string | undefined

  const [expensesSnap, memoriesSnap, daysSnap] = await Promise.all([
    db.collection(`groups/${groupId}/expenses`).get(),
    db.collection(`groups/${groupId}/memories`).get(),
    db.collection(`groups/${groupId}/days`).get(),
  ])

  const totalSpend = expensesSnap.docs.reduce((sum, doc) => {
    const amount = doc.data().amount as number
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0)

  const memories = memoriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const scored = memories
    .map((m) => ({ memory: m, score: scoreMemory(m) }))
    .sort((a, b) => b.score - a.score)

  const topPhotoUrls = scored
    .map((item) => {
      const m = item.memory as Record<string, unknown>
      return (m.photoThumb as string) || (m.photoUrl as string)
    })
    .filter((url): url is string => typeof url === 'string')
    .slice(0, 6)

  const dayItemSnaps = await Promise.all(
    daysSnap.docs.map((day) =>
      db.collection(`groups/${groupId}/days/${day.id}/items`).get(),
    ),
  )

  const placeIds = new Set<string>()
  dayItemSnaps.forEach((snap) => {
    snap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.isConfirmed && data.placeRef?.name) {
        placeIds.add(data.placeRef.placeId || data.placeRef.name)
      }
    })
  })

  const dateRangeLabel = startDate
    ? `${startDate}${endDate ? ` to ${endDate}` : ''}`
    : 'No dates set'

  return {
    groupId,
    groupName: (group.name as string) || 'Trip',
    destination: group.destination as string | undefined,
    coverEmoji: group.coverEmoji as string | undefined,
    startDate,
    endDate,
    dateRangeLabel,
    currency: (group.currency as string) || 'INR',
    status: (group.status as string) || 'active',
    totalSpend,
    tripDays: tripDaysFromDates(startDate, endDate),
    memberCount: memberIds.length,
    memoriesCount: memories.length,
    placesVisitedCount: placeIds.size,
    topPhotoUrls,
  }
}
