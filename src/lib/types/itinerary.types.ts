import type { Timestamp } from 'firebase/firestore'

export type ItineraryCategory = 'food' | 'stay' | 'activity' | 'transport' | 'other'

export type VoteValue = 'yes' | 'maybe' | 'no'

export interface ItineraryLocation {
  lat: number
  lng: number
  placeId: string // Mapbox Place ID — used to fetch full place details on demand
}

export interface ItineraryItem {
  id: string
  groupId: string
  day: number                          // 1-indexed trip day number
  date: string                         // YYYY-MM-DD
  title: string
  placeName?: string                   // Display name of the place
  location?: ItineraryLocation
  startTime: string                    // 24-hour format e.g. "15:00" or "09:30"
  durationMinutes: number              // Expected duration
  category: ItineraryCategory
  notes?: string
  votes: Record<string, VoteValue>    // userId → vote — any member can vote
  completed: boolean                   // Can be toggled by any member
  order: number                        // Float for drag-to-reorder within a day
  createdAt: Timestamp
  createdBy: string
}
