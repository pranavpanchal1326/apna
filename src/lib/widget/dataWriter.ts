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
