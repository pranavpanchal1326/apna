// src/lib/itinerary/aiDraft.ts
// Phase 7.4 — applies an AI-generated itinerary draft to the group's day plans.
// Every inserted item is an UNCONFIRMED proposal (isConfirmed: false) so the
// group reviews/votes before anything becomes part of the real plan.

import { generateAiItinerary, type AiDayPlan } from '@lib/firebase/ai'
import { addItineraryItem } from '@lib/firebase/itinerary'
import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'
import type { ItineraryCategory } from '@lib/schemas'

const VALID_CATEGORIES: ItineraryCategory[] = [
  'attraction', 'food', 'stay', 'transport', 'activity', 'shopping',
]

function toItineraryCategory(raw: string): ItineraryCategory {
  return (VALID_CATEGORIES as string[]).includes(raw)
    ? (raw as ItineraryCategory)
    : 'activity'
}

export interface AiDraftResult {
  itemsAdded: number
  daysFilled: number
}

/**
 * Generates a draft with the AI gateway and inserts it into existing day
 * plans (AI day 1 → first dayId, etc.). Returns null when the AI is
 * unavailable (over quota / providers down) so the UI can say so.
 */
export async function draftItineraryWithAi(params: {
  groupId: string
  uid: string
  destination: string
  dayIds: string[] // ordered — dayPlans[i].id
  interests?: string[]
}): Promise<AiDraftResult | null> {
  const { groupId, uid, destination, dayIds, interests } = params
  if (dayIds.length === 0) return null

  const plans = await generateAiItinerary({
    groupId,
    destination,
    days: dayIds.length,
    interests,
  })
  if (!plans) return null

  let itemsAdded = 0
  const filledDays = new Set<string>()

  for (const plan of plans) {
    const dayId = dayIds[plan.day - 1]
    if (!dayId) continue
    let sortOrder = 1
    for (const item of plan.items) {
      try {
        await addItineraryItem(
          groupId,
          dayId,
          {
            title: item.title,
            category: toItineraryCategory(item.category),
            notes: item.note,
            timeSlot: item.startTime ? { startTime: item.startTime } : undefined,
            sortOrder: sortOrder++,
            isConfirmed: false, // proposals — the group confirms/votes
          } as never,
          uid,
        )
        itemsAdded++
        filledDays.add(dayId)
      } catch (err) {
        captureError(err, { source: 'draftItineraryWithAi', groupId })
      }
    }
  }

  if (itemsAdded === 0) return null
  track('ai_itinerary_drafted', { groupId, itemsAdded })
  return { itemsAdded, daysFilled: filledDays.size }
}

export type { AiDayPlan }
