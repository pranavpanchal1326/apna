// src/lib/utils/listDeadline.ts
// Pure utility functions for deadline urgency derivation.
// All logic is deterministic and testable — no Firestore or state dependencies.
// These functions are intentionally framework-agnostic so they can power
// future reminder scheduling, notification triggers, or filter chips.

import type { DeadlineUrgency } from '../schemas/list.schema'

// ── Constants ─────────────────────────────────────────────────────────
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Hours before deadline that triggers "due soon" state */
export const DUE_SOON_THRESHOLD_HOURS = 48

/** Hours before deadline that triggers "upcoming" state (after due_soon boundary) */
export const UPCOMING_THRESHOLD_DAYS = 7

// ── Core urgency derivation ───────────────────────────────────────────

/**
 * Derives the urgency state of a deadline.
 *
 * @param deadlineDate  ISO date string "YYYY-MM-DD" or undefined
 * @param now           Reference time (defaults to Date.now() — override in tests)
 * @returns DeadlineUrgency enum value
 */
export function getDeadlineUrgency(
  deadlineDate: string | undefined,
  now: number = Date.now(),
): DeadlineUrgency {
  if (!deadlineDate) return 'none'

  // Parse date at start of that day (local midnight)
  const deadlineMs = new Date(deadlineDate + 'T00:00:00').getTime()
  const diffMs     = deadlineMs - now
  const diffHours  = diffMs / (1000 * 60 * 60)
  const diffDays   = diffMs / MS_PER_DAY

  if (diffMs < 0)                         return 'overdue'
  if (diffHours <= DUE_SOON_THRESHOLD_HOURS) return 'due_soon'
  if (diffDays  <= UPCOMING_THRESHOLD_DAYS)  return 'upcoming'
  return 'none'
}

/**
 * Returns a human-readable label for a deadline date.
 * Examples: "Today", "Tomorrow", "3 days", "Jun 15", "Overdue"
 */
export function formatDeadlineLabel(
  deadlineDate: string | undefined,
  now: number = Date.now(),
): string {
  if (!deadlineDate) return ''

  const deadlineMs  = new Date(deadlineDate + 'T00:00:00').getTime()
  const diffMs      = deadlineMs - now
  const diffDays    = Math.ceil(diffMs / MS_PER_DAY)

  if (diffDays < 0)  return 'Overdue'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 6)  return `${diffDays} days`

  // Beyond a week — show formatted date
  return new Date(deadlineDate).toLocaleDateString('en-IN', {
    month: 'short',
    day:   'numeric',
  })
}

/**
 * Maps urgency state to a UI color token key.
 * Caller resolves the key against the theme colors object.
 */
export function urgencyColorKey(urgency: DeadlineUrgency): string {
  switch (urgency) {
    case 'overdue':   return 'accentDanger'
    case 'due_soon':  return 'warning'
    case 'upcoming':  return 'accentPrimary'
    default:          return 'textMuted'
  }
}

/**
 * Returns today's date as an ISO string "YYYY-MM-DD" — useful for deadline pickers.
 */
export function todayISODate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Sorts items by urgency then by original order.
 * Overdue items first, then due_soon, upcoming, none.
 */
const URGENCY_RANK: Record<DeadlineUrgency, number> = {
  overdue:  0,
  due_soon: 1,
  upcoming: 2,
  none:     3,
}

export function urgencyRank(urgency: DeadlineUrgency): number {
  return URGENCY_RANK[urgency]
}
