// src/lib/schemas/itinerary.schema.ts
// Complete itinerary type system.
// These types are shared between the app AND Cloud Functions.
// All Firestore documents must conform to these schemas.
//
// COLLECTION STRUCTURE:
//   groups/{groupId}/days/{dayId}          ← DayPlan document
//   groups/{groupId}/days/{dayId}/items/{itemId}  ← ItineraryItem document
//
// dayId format: "YYYY-MM-DD" (ISO date string, doubles as the document ID)
// itemId format: nanoid(12) — generated client-side at creation

import type { Timestamp } from 'firebase/firestore'

// ── Place Reference ────────────────────────────────────────────────
// Snapshot of Google Place data taken at item-save time.
// Once saved, itinerary works fully offline — no re-fetch needed.
// Do NOT store the raw Places API response — only these whitelisted fields.

export interface PlaceRef {
  placeId:    string        // Google Place ID — stable unique identifier
  name:       string        // Display name (e.g. "Amber Fort")
  address:    string        // Formatted address (e.g. "Amer, Jaipur, Rajasthan")
  lat:        number        // Latitude — for Mapbox pin
  lng:        number        // Longitude — for Mapbox pin
  rating?:    number        // Google rating 1.0–5.0 (if available)
  photoRef?:  string        // Google Photo reference (for thumbnail)
  types?:     string[]      // Place types: ['tourist_attraction', 'point_of_interest']
  priceLevel?: 0 | 1 | 2 | 3 | 4  // Google price level
  website?:   string        // Place website URL
  phone?:     string        // International phone number
}

// ── Item Category ──────────────────────────────────────────────────
// Used for icon selection and color coding on the day planner UI.
export type ItineraryCategory =
  | 'attraction'  // Monuments, museums, viewpoints
  | 'food'        // Restaurants, cafes, street food
  | 'stay'        // Hotels, hostels, Airbnb
  | 'transport'   // Airport, station, bus, taxi
  | 'activity'    // Treks, water sports, adventure
  | 'shopping'    // Markets, malls, local shops
  | 'note'        // Free-text note — no placeRef required
  | 'custom'      // User-defined, with custom emoji

// ── Time Slot ─────────────────────────────────────────────────────
// Optional — items without a time slot are "anytime" and sort to bottom.
export interface TimeSlot {
  startTime:  string   // "HH:MM" 24h format (e.g. "09:30")
  endTime?:   string   // "HH:MM" 24h format (optional duration)
  durationMinutes?: number  // Pre-computed from start/end if both provided
}

// ── Itinerary Item ─────────────────────────────────────────────────
// A single activity, place, or note on a day plan.
// sortOrder is a float — allows insertion between items without reindexing
// (Lexorank-lite: new item between a(1.0) and b(2.0) gets 1.5)

export interface ItineraryItem {
  id:          string             // nanoid(12)
  dayId:       string             // Parent day — "YYYY-MM-DD"
  groupId:     string             // Parent group
  title:       string             // Required — 1–100 chars
  category:    ItineraryCategory
  sortOrder:   number             // Float — for drag-reorder (LexoRank-lite)
  placeRef?:   PlaceRef           // Optional — null for 'note' category
  timeSlot?:   TimeSlot           // Optional — null means "anytime"
  duration?:   number             // Minutes — overrides timeSlot.durationMinutes
  notes?:      string             // Free text — max 500 chars
  emoji?:      string             // Custom emoji — used when category='custom'
  estimatedCost?: number          // In group currency — for budget planning
  currency?:   string             // Defaults to group currency
  imageUrl?:   string             // User-uploaded or Google photo CDN URL
  linkedExpenseIds: string[]      // Expense IDs tagged to this item
  addedByUid:  string             // Creator
  createdAt:   Timestamp
  updatedAt:   Timestamp
  isConfirmed: boolean            // True = locked in; false = tentative
  votes: {                        // 👍/👎 voting for tentative items
    up:   string[]   // Array of uids who voted up
    down: string[]   // Array of uids who voted down
  }
}

// ── Day Plan ──────────────────────────────────────────────────────
// Parent document for all items on a calendar date.
// Stored at groups/{groupId}/days/{YYYY-MM-DD}
// itemCount is maintained by Cloud Function (onItineraryWrite).

export interface DayPlan {
  id:            string     // "YYYY-MM-DD" — same as document ID
  groupId:       string
  date:          string     // "YYYY-MM-DD" — human-readable date
  dayNumber:     number     // Day 1, Day 2, etc. relative to trip start
  title?:        string     // Optional day title: "Golden Triangle Day 2"
  coverEmoji?:   string     // Day emoji: "🏰"
  itemCount:     number     // Maintained by Cloud Function — max 50
  totalEstimatedCost: number  // Sum of item estimatedCosts — maintained by CF
  notes?:        string     // Day-level notes (weather, reminders)
  createdAt:     Timestamp
  updatedAt:     Timestamp
}

// ── Smart Suggestion ──────────────────────────────────────────────
// Returned by getSuggestions Cloud Function.
// NOT stored in Firestore — ephemeral, displayed as chips in UI.

export interface SmartSuggestion {
  placeRef:     PlaceRef
  category:     ItineraryCategory
  reason:       string          // e.g. "Popular with travellers from Mumbai"
  estimatedTime: number         // Minutes to spend here
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime'
  distance?:    number          // Metres from previous item (if known)
}

// ── Input types (used for writes — omit server-generated fields) ───

export type ItineraryItemInput = Omit<
  ItineraryItem,
  'id' | 'createdAt' | 'updatedAt'
>

export type DayPlanInput = Omit<
  DayPlan,
  'id' | 'createdAt' | 'updatedAt' | 'itemCount' | 'totalEstimatedCost'
>

// ── Sort order utilities ───────────────────────────────────────────
// LexoRank-lite: fractional indexing for drag-reorder without reindexing.
// Items start at 1000.0 increments. Insertion = midpoint of neighbors.
// Rebalance only when gap < 0.001 (after 10+ insertions in same spot).

export const SORT_ORDER = {
  INITIAL_GAP: 1000,
  REBALANCE_THRESHOLD: 0.001,

  initial(index: number): number {
    return (index + 1) * SORT_ORDER.INITIAL_GAP
  },

  between(before: number, after: number): number {
    const mid = (before + after) / 2
    if (after - before < SORT_ORDER.REBALANCE_THRESHOLD) {
      // Gap too small — caller should rebalance all items
      console.warn('[apna] sortOrder gap < threshold — rebalance needed')
    }
    return mid
  },

  afterLast(last: number): number {
    return last + SORT_ORDER.INITIAL_GAP
  },

  beforeFirst(first: number): number {
    return first / 2
  },
} as const

// ── Category metadata (for UI — icons, colors, labels) ────────────
export const CATEGORY_META: Record<ItineraryCategory, {
  label:  string
  emoji:  string
  colorKey: string  // Maps to colors.category.* in Dhaga theme
}> = {
  attraction: { label: 'Attraction',  emoji: '🏛️', colorKey: 'transport'   },
  food:       { label: 'Food',        emoji: '🍽️', colorKey: 'food'        },
  stay:       { label: 'Stay',        emoji: '🏨', colorKey: 'stay'        },
  transport:  { label: 'Transport',   emoji: '🚗', colorKey: 'transport'   },
  activity:   { label: 'Activity',    emoji: '🎯', colorKey: 'activities'  },
  shopping:   { label: 'Shopping',    emoji: '🛍️', colorKey: 'shopping'   },
  note:       { label: 'Note',        emoji: '📝', colorKey: 'misc'        },
  custom:     { label: 'Custom',      emoji: '⭐', colorKey: 'misc'        },
}
