// src/lib/utils/generateDayPlans.ts
// Generates DayPlan scaffolding for a trip date range.
// Called from GroupSettingsScreen when startDate/endDate are saved (Prompt 1.6).
// Safe to call multiple times — upsertDayPlan uses setDoc with merge: true.

import { upsertDayPlan } from '../firebase/itinerary'
import type { DayPlanInput } from '../schemas'

export async function generateDayPlans(
  groupId:    string,
  startDate:  string,   // "YYYY-MM-DD"
  endDate:    string,   // "YYYY-MM-DD"
  coverEmoji: string = '📅',
): Promise<string[]> {
  const start  = new Date(startDate)
  const end    = new Date(endDate)
  const dates: string[] = []
  const curr   = new Date(start)

  while (curr <= end && dates.length < 30) {
    const dateStr = curr.toISOString().split('T')[0]
    dates.push(dateStr)
    curr.setDate(curr.getDate() + 1)
  }

  // Upsert all days — parallel writes (max 30)
  const dayIds = await Promise.all(
    dates.map((date, i) => {
      const input: DayPlanInput = {
        groupId,
        date,
        dayNumber: i + 1,
        coverEmoji,
        notes:     undefined,
        title:     undefined,
      }
      return upsertDayPlan(groupId, input)
    })
  )

  return dayIds
}
