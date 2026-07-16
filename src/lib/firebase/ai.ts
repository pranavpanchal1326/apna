// src/lib/firebase/ai.ts
// Client wrappers for the Phase 7 AI callables. All AI traffic goes through
// the server-side gateway (keys, quota and cache live there) — these wrappers
// only shape requests/responses and swallow failures into safe fallbacks.

import { httpsCallable } from 'firebase/functions'
import { functions } from './config'
import type { ExpenseCategory } from '@lib/schemas'

// ── 7.2 Smart expense categorization ─────────────────────────────────────────

const categorizeExpenseFn = httpsCallable<
  { description: string },
  { category: ExpenseCategory; source: string }
>(functions, 'categorizeExpense')

/** Suggests a category for a description. Null on any failure — never throws. */
export async function suggestExpenseCategory(
  description: string,
): Promise<ExpenseCategory | null> {
  try {
    const result = await categorizeExpenseFn({ description })
    return result.data.category
  } catch {
    return null
  }
}

// ── 7.4 AI itinerary generator ───────────────────────────────────────────────

export interface AiItineraryItem {
  title: string
  category: string
  startTime?: string
  note?: string
}

export interface AiDayPlan {
  day: number
  theme: string
  items: AiItineraryItem[]
}

const generateAiItineraryFn = httpsCallable<
  { groupId: string; destination: string; days: number; interests?: string[] },
  { success: boolean; plans?: AiDayPlan[]; message?: string }
>(functions, 'generateAiItinerary')

export async function generateAiItinerary(params: {
  groupId: string
  destination: string
  days: number
  interests?: string[]
}): Promise<AiDayPlan[] | null> {
  try {
    const result = await generateAiItineraryFn(params)
    return result.data.success && result.data.plans ? result.data.plans : null
  } catch {
    return null
  }
}

// ── 7.5 Dietary suggestions + Trip Wrap captions ─────────────────────────────

export interface DietarySuggestion {
  name: string
  area: string
  why: string
}

const getDietarySuggestionsFn = httpsCallable<
  { groupId: string; destination: string; dietary: string },
  { success: boolean; suggestions?: DietarySuggestion[] }
>(functions, 'getDietarySuggestions')

export async function fetchDietarySuggestions(
  groupId: string,
  destination: string,
  dietary: string,
): Promise<DietarySuggestion[] | null> {
  try {
    const result = await getDietarySuggestionsFn({ groupId, destination, dietary })
    return result.data.success && result.data.suggestions ? result.data.suggestions : null
  } catch {
    return null
  }
}

const generateWrapCaptionFn = httpsCallable<
  { groupId: string },
  { success: boolean; caption?: string }
>(functions, 'generateWrapCaption')

export async function fetchWrapCaption(groupId: string): Promise<string | null> {
  try {
    const result = await generateWrapCaptionFn({ groupId })
    return result.data.success && result.data.caption ? result.data.caption : null
  } catch {
    return null
  }
}
