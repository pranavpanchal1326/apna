// functions/src/engine/recurrence.ts
// Pure recurrence date math for recurring expenses (rent, subscriptions).
// NO Firebase imports — pure logic only.
// Mirrors src/lib/utils/recurrence.ts on the client.

export type RecurrenceFrequency = 'weekly' | 'monthly'

export interface RecurringTemplate {
  frequency: RecurrenceFrequency
  /** Anchor day-of-month (1–31) for monthly templates. Clamped to short months. */
  dayOfMonth?: number
  nextRunDate: string   // YYYY-MM-DD
  endDate?: string      // YYYY-MM-DD — inclusive last generation date
  active: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month == last day of this month
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/**
 * Computes the next run date after `current`.
 * Monthly recurrences anchor to `dayOfMonth` and clamp to short months
 * (rent on the 31st fires Feb 28/29, then returns to the 31st in March).
 */
export function computeNextRunDate(
  current: string,
  frequency: RecurrenceFrequency,
  dayOfMonth?: number,
): string {
  const date = parseDate(current)

  if (frequency === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7)
    return toDateString(date)
  }

  // Monthly: advance one month, anchored to dayOfMonth (defaults to current day)
  const anchor = dayOfMonth ?? date.getUTCDate()
  let year = date.getUTCFullYear()
  let monthIndex = date.getUTCMonth() + 1
  if (monthIndex > 11) {
    monthIndex = 0
    year += 1
  }
  const day = Math.min(anchor, daysInMonth(year, monthIndex))
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

/** True when the template should generate an expense for `today` (YYYY-MM-DD). */
export function isDue(template: RecurringTemplate, today: string): boolean {
  if (!template.active) return false
  if (template.endDate && template.nextRunDate > template.endDate) return false
  return template.nextRunDate <= today
}

/** True when the template has no future runs left after `nextRunDate` advanced. */
export function isExpired(template: Pick<RecurringTemplate, 'nextRunDate' | 'endDate'>): boolean {
  return Boolean(template.endDate && template.nextRunDate > template.endDate)
}

/**
 * Deterministic expense id for a generated occurrence — makes the
 * scheduler idempotent (retries never double-charge the group).
 */
export function occurrenceExpenseId(templateId: string, runDate: string): string {
  return `rec_${templateId}_${runDate}`
}
