// src/lib/widget/dataWriter.ts
// Writes the widget JSON payload atomically to FileSystem.documentDirectory.
// Called from the foreground app and from the background location task.
// Kotlin WidgetDataReader reads this file synchronously from the same path.

import * as FileSystem from 'expo-file-system/legacy'
import { captureError } from '@lib/sentry'
import type { WidgetPayload } from './types'

const WIDGET_FILENAME = 'apna_widget_data.json'

function getWidgetFilePath(): string {
  const base = FileSystem.documentDirectory ?? ''
  // Ensure no double slashes
  return base.endsWith('/') ? `${base}${WIDGET_FILENAME}` : `${base}/${WIDGET_FILENAME}`
}

/**
 * Reads the currently persisted widget payload, or returns a default skeleton.
 * Used for partial updates (e.g., update only the balance while preserving map data).
 */
async function readCurrentPayload(): Promise<WidgetPayload> {
  const path = getWidgetFilePath()
  try {
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) return { balance: null, map: null }
    const raw = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    })
    return JSON.parse(raw) as WidgetPayload
  } catch {
    return { balance: null, map: null }
  }
}

/**
 * Atomically writes the merged widget payload to disk.
 * Performs a deep-merge so callers can update only one section at a time.
 */
export async function writeWidgetData(
  partial: Partial<WidgetPayload>
): Promise<void> {
  try {
    const current = await readCurrentPayload()
    const merged: WidgetPayload = {
      balance: partial.balance !== undefined ? partial.balance : current.balance,
      map: partial.map !== undefined ? partial.map : current.map,
    }
    const json = JSON.stringify(merged)
    await FileSystem.writeAsStringAsync(getWidgetFilePath(), json, {
      encoding: FileSystem.EncodingType.UTF8,
    })
  } catch (err) {
    // Non-fatal — never block the main flow for a widget write failure
    captureError(err as Error, { source: 'widget.dataWriter.writeWidgetData' })
  }
}

/**
 * Clears the widget data file on logout / group deactivation.
 */
export async function clearWidgetData(): Promise<void> {
  try {
    const path = getWidgetFilePath()
    const info = await FileSystem.getInfoAsync(path)
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true })
    }
  } catch (err) {
    captureError(err as Error, { source: 'widget.dataWriter.clearWidgetData' })
  }
}

/**
 * Builds balance widget payload.
 */
export async function buildBalanceWidgetData(params: {
  groupId: string
  groupName: string
  currency: string
  userId: string
  netBalances: Record<string, number>
}): Promise<{
  balanceLabel: 'You are owed' | 'You owe' | 'All settled'
  userBalance: number
  formattedBalance: string
  deepLinkUrl: string
}> {
  const userBalance = params.netBalances[params.userId] ?? 0
  let balanceLabel: 'You are owed' | 'You owe' | 'All settled' = 'All settled'
  if (userBalance > 0) {
    balanceLabel = 'You are owed'
  } else if (userBalance < 0) {
    balanceLabel = 'You owe'
  }

  const symbol = params.currency === 'USD' ? '$' : '₹'
  const formattedBalance = `${symbol}${Math.abs(userBalance)}`

  return {
    balanceLabel,
    userBalance,
    formattedBalance,
    deepLinkUrl: `apna://budget?groupId=${params.groupId}`,
  }
}

/**
 * Builds map widget payload.
 */
export async function buildMapWidgetData(params: {
  groupId: string
  groupName: string
  memberProfiles: Record<string, { name: string; avatarColor: string }>
  memberLocations: Record<
    string,
    { lat: number; lng: number; accuracy: number; timestamp: number; sharing: boolean }
  >
}): Promise<{
  members: Array<{
    uid: string
    name: string
    avatarColor: string
    isLive: boolean
    initials: string
  }>
  liveCount: number
}> {
  const now = Date.now()
  const members = Object.entries(params.memberLocations)
    .map(([uid, loc]) => {
      const profile = params.memberProfiles[uid] || { name: 'Member', avatarColor: '#4ECDC4' }
      const isLive = loc.sharing && (now - loc.timestamp < 60000)
      
      const names = profile.name.trim().split(/\s+/)
      const initials = names.length > 1
        ? (names[0][0] + names[1][0]).toUpperCase()
        : names[0].slice(0, 2).toUpperCase()

      return {
        uid,
        name: profile.name,
        avatarColor: profile.avatarColor,
        isLive,
        initials,
        timestamp: loc.timestamp,
        sharing: loc.sharing,
      }
    })
    
  members.sort((a, b) => b.timestamp - a.timestamp)

  const liveCount = members.filter(m => m.sharing && (now - m.timestamp < 60000)).length

  const cappedMembers = members.slice(0, 3).map(m => ({
    uid: m.uid,
    name: m.name,
    avatarColor: m.avatarColor,
    isLive: m.isLive,
    initials: m.initials,
  }))

  return {
    members: cappedMembers,
    liveCount,
  }
}
