import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string         // Firebase Auth UID — immutable primary key
  phone: string       // Stored as +91XXXXXXXXXX (E.164 format)
  phoneHash?: string  // Client-side SHA-256 phone hash truncated to 16 hex chars
  name: string        // Display name, max 40 chars
  avatarColor: string // One hex from AVATAR_COLORS array
  avatarUrl?: string  // Phase 4+ only — not collected in onboarding v1
  createdAt: Timestamp
  groups: string[]    // Array of group document IDs the user belongs to
}

// 8 curated colors shown in onboarding color picker — order is fixed and
// maps to index positions stored in Firestore. Do not reorder.
export const AVATAR_COLORS = [
  '#4ECDC4', // teal      — matches accent primary
  '#FF6B6B', // coral     — matches accent danger
  '#FFD166', // gold      — matches accent gold
  '#A8E6CF', // mint
  '#FF8B94', // pink
  '#7EC8E3', // sky blue
  '#B5B5FF', // lavender
  '#FECA57', // yellow
] as const

export type AvatarColor = (typeof AVATAR_COLORS)[number]
