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
  upiId?: string      // Payment prefs — VPA for one-tap settle up (name@bank)
  notificationPrefs?: import('../schemas/user.schema').NotificationPrefs // Per-type toggles + silent hours
}

// 8 dyed-thread colors (Blueprint §2.1.4) — order is fixed and maps to index
// positions stored in Firestore. Do not reorder. Rule: a person's thread color
// is derived from uid hash — stable across groups, screens, sessions.
export const AVATAR_COLORS = [
  '#D96A50', // madder
  '#8FAE9A', // leaf
  '#C9A24B', // haldi
  '#A98BB8', // jamun (muted plum)
  '#7FA0B8', // indigo-wash
  '#C98B6B', // clay
  '#B8A98B', // jute
  '#B87F8F', // rose-madder
] as const

export type AvatarColor = (typeof AVATAR_COLORS)[number]
