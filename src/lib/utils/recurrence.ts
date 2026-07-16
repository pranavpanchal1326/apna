// src/lib/utils/recurrence.ts
// Client-side recurrence helpers.
// Mirrors functions/src/engine/recurrence.ts (authoritative server copy).

import type { RecurrenceFrequency } from '@lib/schemas'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * Computes the next run date strictly after `current` (local time).
 * Monthly anchors to `dayOfMonth`, clamped to short months.
 */
export function computeNextRunDate(
  current: string,
  frequency: RecurrenceFrequency,
  dayOfMonth?: number,
): string {
  const [y, m, d] = current.split('-').map(Number)

  if (frequency === 'weekly') {
    const date = new Date(y, m - 1, d + 7)
    return toDateString(date)
  }

  const anchor = dayOfMonth ?? d
  let year = y
  let monthIndex = m // zero-based next month (m is 1-based current month)
  if (monthIndex > 11) {
    monthIndex = 0
    year += 1
  }
  return `${year}-${pad(monthIndex + 1)}-${pad(Math.min(anchor, daysInMonth(year, monthIndex)))}`
}

/** First occurrence on/after today for a new template. */
export function initialRunDate(
  frequency: RecurrenceFrequency,
  dayOfMonth: number | undefined,
  today: Date = new Date(),
): string {
  const todayStr = toDateString(today)
  if (frequency === 'weekly' || !dayOfMonth) {
    return todayStr
  }
  const clamped = Math.min(dayOfMonth, daysInMonth(today.getFullYear(), today.getMonth()))
  if (clamped >= today.getDate()) {
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(clamped)}`
  }
  // Anchor day already passed this month — start next month
  return computeNextRunDate(todayStr, 'monthly', dayOfMonth)
}

/** Human-readable label, e.g. "Repeats monthly on the 5th". */
export function describeRecurrence(frequency: RecurrenceFrequency, dayOfMonth?: number): string {
  if (frequency === 'weekly') return 'Repeats weekly'
  if (!dayOfMonth) return 'Repeats monthly'
  const suffix =
    dayOfMonth % 10 === 1 && dayOfMonth !== 11 ? 'st'
    : dayOfMonth % 10 === 2 && dayOfMonth !== 12 ? 'nd'
    : dayOfMonth % 10 === 3 && dayOfMonth !== 13 ? 'rd'
    : 'th'
  return `Repeats monthly on the ${dayOfMonth}${suffix}`
}
