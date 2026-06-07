import type { Timestamp } from 'firebase/firestore'

export interface MemoryPhoto {
  url: string       // Full-resolution Firebase Storage URL
  thumbnail: string // Compressed preview, max 200px wide — used in grid views
  width: number     // Original image width in pixels
  height: number    // Original image height in pixels
}

export interface MemoryLocation {
  lat: number
  lng: number
  placeName: string // Human-readable e.g. "Amber Fort, Jaipur"
}

// 5 fixed reaction options — matching WhatsApp-style quick reactions
export type ReactionEmoji = '❤️' | '😂' | '🔥' | '😮' | '👏'

export interface Memory {
  id: string
  groupId: string
  photos: MemoryPhoto[]                    // 1–10 photos per memory post
  caption?: string                         // Optional caption, max 200 chars
  location?: MemoryLocation                // GPS-tagged location
  tripDay?: number                         // 1-indexed day number during Trip Mode
  reactions: Record<string, ReactionEmoji> // userId → emoji (one per user)
  addedBy: string                          // userId who posted this memory
  createdAt: Timestamp
}

// Ordered array for the reaction picker UI — order determines display position
export const REACTION_EMOJIS: ReactionEmoji[] = ['❤️', '😂', '🔥', '😮', '👏']
