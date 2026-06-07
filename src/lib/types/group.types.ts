import type { Timestamp } from 'firebase/firestore'

export type MemberRole = 'admin' | 'co-admin' | 'member'

export interface GroupMember {
  role: MemberRole
  joinedAt: Timestamp
  nickname?: string // Optional custom nickname within the group
}

export interface TripMode {
  active: boolean
  startDate?: string   // YYYY-MM-DD
  endDate?: string     // YYYY-MM-DD
  destination?: string // e.g. "Jaipur, Rajasthan"
}

export interface Group {
  id: string
  name: string
  coverPhotoUrl?: string
  members: Record<string, GroupMember> // key: userId
  inviteCode: string                   // 6-char uppercase e.g. "APNA26"
  inviteCodeExpiry: Timestamp          // 30 days from generation
  tripMode: TripMode
  baseCurrency: string                 // ISO 4217 code — default 'INR'
  createdAt: Timestamp
  createdBy: string                    // userId of group creator (always admin)
}

// Lightweight version for group list screens — avoids loading full members map
export interface GroupSummary {
  id: string
  name: string
  memberCount: number
  coverPhotoUrl?: string
  tripMode: Pick<TripMode, 'active' | 'startDate' | 'endDate' | 'destination'>
}
