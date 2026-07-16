// functions/src/recap/yearReviewBuilder.ts
// Year in Review (PRD §17) — aggregates one calendar year of group activity.
// Pure helpers are exported for unit tests; buildYearInReview does the reads.

import * as admin from 'firebase-admin'

export interface YearInReviewDoc {
  year: number
  groupId: string
  groupName: string
  coverEmoji?: string
  currency: string
  totalSpend: number
  expenseCount: number
  topCategory: string | null
  memoriesCount: number
  topPhotoUrls: string[]
  memberCount: number
  generatedAt: admin.firestore.Timestamp
}

/** True when a doc's YYYY-MM-DD `date` field falls in `year`. */
export function isInYear(data: Record<string, unknown>, year: number): boolean {
  const date = data.date
  return typeof date === 'string' && date.startsWith(`${year}-`)
}

/** Most frequent expense category, or null when there are no expenses. */
export function topCategory(
  expenses: Array<Record<string, unknown>>,
): string | null {
  const counts = new Map<string, number>()
  for (const expense of expenses) {
    const category = expense.category
    if (typeof category !== 'string') continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category
      bestCount = count
    }
  }
  return best
}

// Multi-photo memories carry photos[]; legacy docs carry photoUrl/photoThumb.
function firstPhotoUrl(data: Record<string, unknown>): string | undefined {
  const photos = data.photos as { url?: string; thumb?: string }[] | undefined
  if (Array.isArray(photos)) {
    const first = photos.find((p) => p?.url)
    if (first) return first.thumb || first.url
  }
  return (data.photoThumb as string) || (data.photoUrl as string) || undefined
}

function scoreMemory(data: Record<string, unknown>): number {
  let score = 0
  const reactions = data.reactions as Record<string, string> | undefined
  if (reactions) score += Object.keys(reactions).length
  const caption = data.caption as string | undefined
  if (caption?.trim()) score += 2
  if (firstPhotoUrl(data)) score += 5
  return score
}

/** Best photo URLs from a year's memories, highest-engagement first. */
export function pickTopPhotos(
  memories: Array<Record<string, unknown>>,
  limit = 6,
): string[] {
  return memories
    .map((m) => ({ url: firstPhotoUrl(m), score: scoreMemory(m) }))
    .filter((item): item is { url: string; score: number } => Boolean(item.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.url)
}

/**
 * Builds the Year in Review doc for a group, or null when the group had
 * no activity (no expenses AND no memories) in that year.
 */
export async function buildYearInReview(
  groupId: string,
  year: number,
): Promise<YearInReviewDoc | null> {
  const db = admin.firestore()
  const groupSnap = await db.collection('groups').doc(groupId).get()
  if (!groupSnap.exists) return null

  const group = groupSnap.data() as Record<string, unknown>

  const [expensesSnap, memoriesSnap] = await Promise.all([
    db.collection(`groups/${groupId}/expenses`).get(),
    db.collection(`groups/${groupId}/memories`).get(),
  ])

  const yearExpenses = expensesSnap.docs
    .map((doc) => doc.data())
    .filter((data) => isInYear(data, year))
  const yearMemories = memoriesSnap.docs
    .map((doc) => doc.data())
    .filter((data) => isInYear(data, year))

  if (yearExpenses.length === 0 && yearMemories.length === 0) return null

  const totalSpend = yearExpenses.reduce((sum, expense) => {
    const amount = expense.amount
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0)

  return {
    year,
    groupId,
    groupName: (group.name as string) || 'Group',
    coverEmoji: group.coverEmoji as string | undefined,
    currency: (group.currency as string) || 'INR',
    totalSpend,
    expenseCount: yearExpenses.length,
    topCategory: topCategory(yearExpenses),
    memoriesCount: yearMemories.length,
    topPhotoUrls: pickTopPhotos(yearMemories),
    memberCount: ((group.memberIds as string[]) ?? []).length,
    generatedAt: admin.firestore.Timestamp.now(),
  }
}
