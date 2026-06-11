// src/lib/utils/hangout.ts
// Pure utilities for hangout quorum derivation and display formatting.
// All functions are deterministic and side-effect free — safe to test in isolation.

import type { Hangout, RsvpValue } from '../schemas/hangout.schema'

// ── Quorum ────────────────────────────────────────────────────────────

/**
 * Returns true if yes-vote count has reached or exceeded the quorum threshold.
 */
export function isQuorumReached(hangout: Hangout): boolean {
  return hangout.yesCount >= hangout.quorumThreshold
}

/**
 * Number of additional yes-votes needed to confirm.
 * Returns 0 if quorum is already reached.
 */
export function yesVotesNeeded(hangout: Hangout): number {
  return Math.max(0, hangout.quorumThreshold - hangout.yesCount)
}

/**
 * Default quorum threshold for a group of a given size.
 * Rule: ceil(groupSize / 2), minimum 2.
 */
export function defaultQuorum(groupSize: number): number {
  return Math.max(2, Math.ceil(groupSize / 2))
}

// ── Status display ────────────────────────────────────────────────────

export type HangoutDisplayState = 'upcoming' | 'confirmed' | 'past' | 'canceled'

/**
 * Derives a display state from status and scheduled date.
 * Useful for sorting and visual treatment in list views.
 */
export function hangoutDisplayState(hangout: Hangout): HangoutDisplayState {
  if (hangout.status === 'canceled') return 'canceled'
  if (hangout.status === 'confirmed') {
    const scheduled = new Date(hangout.scheduledDate + 'T23:59:59').getTime()
    return Date.now() > scheduled ? 'past' : 'confirmed'
  }
  const scheduled = new Date(hangout.scheduledDate + 'T23:59:59').getTime()
  return Date.now() > scheduled ? 'past' : 'upcoming'
}

/**
 * Formats the scheduled date and time into a readable label.
 * Examples: "Today, 7:00 PM", "Tomorrow, 8:30 PM", "Jun 15, 7:00 PM"
 */
export function formatHangoutTime(hangout: Hangout): string {
  const dateMs    = new Date(hangout.scheduledDate + 'T00:00:00').getTime()
  const todayMs   = new Date().setHours(0, 0, 0, 0)
  const diffDays  = Math.round((dateMs - todayMs) / 86400000)

  let datePart: string
  if (diffDays === 0)      datePart = 'Today'
  else if (diffDays === 1) datePart = 'Tomorrow'
  else if (diffDays === -1) datePart = 'Yesterday'
  else {
    datePart = new Date(hangout.scheduledDate).toLocaleDateString('en-IN', {
      month: 'short',
      day:   'numeric',
    })
  }

  if (!hangout.scheduledTime) return datePart

  // Format time: "19:30" → "7:30 PM"
  const [hStr, mStr] = hangout.scheduledTime.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 === 0 ? 12 : h % 12
  return `${datePart}, ${h12}:${m} ${suffix}`
}

// ── RSVP helpers ──────────────────────────────────────────────────────

/** Returns the current RSVP value for a user, or null if not voted. */
export function myRsvp(hangout: Hangout, uid: string): RsvpValue | null {
  return (hangout.rsvps[uid]?.value ?? null) as RsvpValue | null
}

/** Returns a sorted list of uids who voted a given RSVP value. */
export function rsvpUids(hangout: Hangout, value: RsvpValue): string[] {
  return Object.entries(hangout.rsvps)
    .filter(([, entry]) => entry.value === value)
    .map(([uid]) => uid)
}

// ── Sort comparator ───────────────────────────────────────────────────

/**
 * Sort hangouts for a list view:
 * 1. Upcoming confirmed first
 * 2. Upcoming proposed
 * 3. Past (descending by date)
 * 4. Canceled last
 */
export function sortHangouts(a: Hangout, b: Hangout): number {
  const stateRank: Record<string, number> = {
    confirmed: 0,
    upcoming:  1,
    past:      2,
    canceled:  3,
  }
  const aState = hangoutDisplayState(a)
  const bState = hangoutDisplayState(b)

  const rankDiff = (stateRank[aState] ?? 4) - (stateRank[bState] ?? 4)
  if (rankDiff !== 0) return rankDiff

  // Within same group — sort by scheduled date ascending
  return a.scheduledDate.localeCompare(b.scheduledDate)
}
