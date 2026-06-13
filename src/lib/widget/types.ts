// src/lib/widget/types.ts
// Shared data contract between the TypeScript app layer and the Kotlin Glance widgets.
// Matches the JSON structure written to FileSystem.documentDirectory + 'apna_widget_data.json'.

/**
 * Represents one live member as shown in the Map Widget avatar strip.
 */
export interface WidgetMember {
  /** Firebase UID */
  uid: string
  /** Display name — first name or fallback 'Member' */
  name: string
  /** CSS-compatible hex color used for avatar background */
  avatarColor: string
  /** Whether this member is currently sharing their live location */
  isLive: boolean
}

/**
 * Balance payload for the Balance Widget.
 * All monetary values are in full rupees (never paise) to keep JSON readable.
 */
export interface WidgetBalanceData {
  groupId: string
  groupName: string
  /** Signed rupee amount — positive means "you are owed", negative means "you owe" */
  balanceRupees: number
  /** Human-readable label — derived from sign */
  label: 'You are owed' | 'You owe' | 'All settled'
  /** ISO-8601 timestamp of when the data was last written */
  updatedAt: string
}

/**
 * Map payload for the Map Widget.
 */
export interface WidgetMapData {
  groupId: string
  groupName: string
  /** Total members in the group sharing location (sharing === true) */
  sharingCount: number
  /** Up to 3 members — shown as overlapping avatar chips */
  previewMembers: WidgetMember[]
  /** ISO-8601 timestamp of when the data was last written */
  updatedAt: string
}

/**
 * Root JSON written to `apna_widget_data.json`.
 */
export interface WidgetPayload {
  balance: WidgetBalanceData | null
  map: WidgetMapData | null
}
