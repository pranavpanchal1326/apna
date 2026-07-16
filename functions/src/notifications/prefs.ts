// functions/src/notifications/prefs.ts
// Per-user notification preferences — pure logic, no Firebase imports.
// Stored on users/{uid}.notificationPrefs; absent prefs mean "all defaults".
//
// SOS pushes ALWAYS deliver — they bypass every preference and silent hours.

export interface SilentHours {
  enabled: boolean
  startHour: number // 0–23, inclusive start (e.g. 23)
  endHour: number   // 0–23, exclusive end   (e.g. 8 → quiet until 07:59)
}

export interface NotificationPrefs {
  expenses: boolean
  settlements: boolean
  memories: boolean
  itinerary: boolean
  groupUpdates: boolean
  silentHours: SilentHours
}

export const DEFAULT_PREFS: NotificationPrefs = {
  expenses: true,
  settlements: true,
  memories: true,
  itinerary: true,
  groupUpdates: true,
  silentHours: { enabled: true, startHour: 23, endHour: 8 },
}

export type NotificationCategory = keyof Omit<NotificationPrefs, 'silentHours'>

// Maps FCM data.type values (see templates.ts and reminder senders) to a category.
const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  expense_added: 'expenses',
  expense_updated: 'expenses',
  settlement_recorded: 'settlements',
  memory_reaction: 'memories',
  on_this_day: 'memories',
  YEAR_IN_REVIEW: 'memories',
  ITINERARY_REMINDER: 'itinerary',
  HANGOUT_REMINDER: 'groupUpdates',
  TASK_REMINDER: 'groupUpdates',
  trip_event: 'itinerary',
  member_joined: 'groupUpdates',
  group_completed: 'groupUpdates',
  group_invite_regenerated: 'groupUpdates',
  admin_transferred: 'groupUpdates',
  member_removed: 'groupUpdates',
  budget_alert: 'expenses',
}

export function categoryForType(type: string): NotificationCategory | null {
  return TYPE_TO_CATEGORY[type] ?? null
}

/** Merges a (possibly partial / absent) stored prefs object over the defaults. */
export function resolvePrefs(stored: unknown): NotificationPrefs {
  if (!stored || typeof stored !== 'object') return DEFAULT_PREFS
  const s = stored as Partial<NotificationPrefs>
  return {
    ...DEFAULT_PREFS,
    ...s,
    silentHours: { ...DEFAULT_PREFS.silentHours, ...(s.silentHours ?? {}) },
  }
}

/** True when `hour` falls inside the (possibly midnight-wrapping) quiet window. */
export function isInSilentHours(silent: SilentHours, hour: number): boolean {
  if (!silent.enabled) return false
  const { startHour, endHour } = silent
  if (startHour === endHour) return false // degenerate window = off
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour // wraps midnight (23 → 8)
}

/**
 * The single delivery gate: should this notification type reach this user now?
 * `hour` is the user's local hour (IST for apna's launch market).
 */
export function allowsNotification(
  prefs: NotificationPrefs,
  type: string,
  hour: number,
): boolean {
  if (type === 'sos' || type === 'SOS_ALERT') return true // safety overrides everything
  if (isInSilentHours(prefs.silentHours, hour)) return false
  const category = categoryForType(type)
  if (category === null) return true // unknown types default to deliver
  return prefs[category]
}
