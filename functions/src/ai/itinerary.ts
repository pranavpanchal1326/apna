// functions/src/ai/itinerary.ts
// Phase 7.4 — AI itinerary generator: pure prompt/parse helpers.
// The model returns strict JSON; parsing is defensive and unit-tested.

export interface GeneratedItineraryItem {
  title: string
  category: string
  startTime?: string // HH:MM
  note?: string
}

export interface GeneratedDayPlan {
  day: number // 1-indexed
  theme: string
  items: GeneratedItineraryItem[]
}

const VALID_CATEGORIES = ['food', 'attraction', 'activity', 'shopping', 'transport', 'stay']

/**
 * Small models routinely ignore "return an array" and emit a bare object or
 * a sequence of objects ("{day1}\n{day2}"). Try, in order:
 *   1. as-is  2. wrapped in [ ]  3. object-sequence joined with commas
 * A single parsed object is promoted to a one-element array.
 */
function parseLenient(raw: string): unknown {
  const attempts = [raw, `[${raw}]`, `[${raw.replace(/}\s*,?\s*{/g, '},{')}]`]
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return [parsed]
    } catch {
      // try next shape
    }
  }
  return null
}

export function buildItineraryPrompt(
  destination: string,
  days: number,
  interests?: string[],
): string {
  const interestLine = interests?.length
    ? `The group is interested in: ${interests.slice(0, 5).join(', ')}.\n`
    : ''
  return (
    `Create a ${days}-day trip itinerary for a group of friends visiting ${destination}, India-friendly budget.\n` +
    interestLine +
    `Respond with ONLY a single valid JSON array (no markdown, no prose). ` +
    `Your entire response must start with [ and end with ], matching exactly:\n` +
    `[{"day":1,"theme":"...","items":[{"title":"...","category":"food|attraction|activity|shopping|transport|stay","startTime":"HH:MM","note":"..."}]}]\n` +
    `Rules: 3-5 items per day, realistic timings, note under 90 chars, title under 60 chars.`
  )
}

/**
 * Parses and validates the model's JSON into day plans.
 * Returns null when the output is unusable (caller shows an error, never
 * writes garbage to Firestore).
 */
export function parseItineraryJson(raw: string, expectedDays: number): GeneratedDayPlan[] | null {
  const parsed = parseLenient(raw)
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const plans: GeneratedDayPlan[] = []
  for (const entry of parsed.slice(0, expectedDays)) {
    const day = entry as Record<string, unknown>
    const items = Array.isArray(day.items) ? day.items : []
    const cleanItems: GeneratedItineraryItem[] = []
    for (const rawItem of items.slice(0, 6)) {
      const item = rawItem as Record<string, unknown>
      if (typeof item.title !== 'string' || !item.title.trim()) continue
      const category =
        typeof item.category === 'string' && VALID_CATEGORIES.includes(item.category)
          ? item.category
          : 'activity'
      const startTime =
        typeof item.startTime === 'string' && /^\d{2}:\d{2}$/.test(item.startTime)
          ? item.startTime
          : undefined
      cleanItems.push({
        title: item.title.trim().slice(0, 60),
        category,
        startTime,
        note: typeof item.note === 'string' ? item.note.trim().slice(0, 90) : undefined,
      })
    }
    if (cleanItems.length === 0) continue
    plans.push({
      day: typeof day.day === 'number' && day.day >= 1 ? Math.floor(day.day) : plans.length + 1,
      theme: typeof day.theme === 'string' ? day.theme.trim().slice(0, 60) : `Day ${plans.length + 1}`,
      items: cleanItems,
    })
  }
  return plans.length > 0 ? plans : null
}
