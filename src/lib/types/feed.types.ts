import type { Timestamp } from 'firebase/firestore'

export type FeedItemType =
  | 'expense_added'
  | 'memory_posted'
  | 'member_joined'
  | 'check_in'
  | 'settlement'
  | 'itinerary_added'
  | 'list_claimed'
  | 'hangout_confirmed'

export interface FeedItem {
  id: string
  groupId: string
  type: FeedItemType
  actorId: string                   // userId who performed the action
  actorName: string                 // Denormalized — avoids extra Firestore reads on feed load
  content: string                   // Pre-rendered human-readable string (set by Cloud Function)
  metadata: Record<string, unknown> // Type-specific extra data (amount, photoUrl, day, etc.)
  createdAt: Timestamp
}

// Template strings used by Cloud Functions to generate feed content.
// Placeholders in {braces} are replaced with values from the triggering document.
export const FEED_CONTENT_TEMPLATES: Record<FeedItemType, string> = {
  expense_added:     '{actorName} added ₹{amount} for {description}',
  memory_posted:     '{actorName} posted {count} photo(s) · {placeName}',
  member_joined:     '{actorName} joined apna 👋',
  check_in:          '{actorName} checked in at {placeName}',
  settlement:        '{actorName} settled ₹{amount} with {targetName}',
  itinerary_added:   '{actorName} added {title} to Day {day}',
  list_claimed:      '{actorName} claimed: {itemName}',
  hangout_confirmed: '{title} is confirmed — {count} going',
}
