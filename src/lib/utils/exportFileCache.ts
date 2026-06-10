// src/lib/utils/exportFileCache.ts
// Handles local file caching and automated cleanup of generated reports.
// Prevents device storage bloat by purging exports older than 24 hours.

import * as FileSystem from 'expo-file-system/legacy'
import { captureError } from '../sentry'

const EXPORT_DIR = `${FileSystem.cacheDirectory}apna-exports/`
const ONE_DAY_MS = 24 * 60 * 60 * 1000 // 24 hours TTL

/**
 * Ensures the temporary exports folder exists in the app cache directory.
 */
export async function ensureExportDirectoryExists(): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(EXPORT_DIR)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true })
  }
  return EXPORT_DIR
}

/**
 * Writes a CSV string to a temporary file in the cache directory.
 * Returns the resulting local file URI.
 */
export async function writeCsvToCache(filename: string, content: string): Promise<string> {
  await ensureExportDirectoryExists()
  const fileUri = `${EXPORT_DIR}${filename}`
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  return fileUri
}

/**
 * Copies a temporary PDF file (e.g. from expo-print) into the export cache folder
 * with a human-readable file name for premium presentation in the native share sheet.
 * Returns the resulting local file URI.
 */
export async function copyPdfToCache(sourceUri: string, filename: string): Promise<string> {
  await ensureExportDirectoryExists()
  const fileUri = `${EXPORT_DIR}${filename}`
  await FileSystem.copyAsync({
    from: sourceUri,
    to: fileUri,
  })
  // Attempt to delete original printed file to free space
  try {
    await FileSystem.deleteAsync(sourceUri, { idempotent: true })
  } catch {
    // Non-critical, ignore
  }
  return fileUri
}

/**
 * Sweeps the exports directory and deletes any files older than 24 hours.
 */
export async function cleanStaleExports(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(EXPORT_DIR)
    if (!dirInfo.exists) return

    const files = await FileSystem.readDirectoryAsync(EXPORT_DIR)
    const now = Date.now()

    for (const file of files) {
      const fileUri = `${EXPORT_DIR}${file}`
      const info = await FileSystem.getInfoAsync(fileUri)
      
      if (info.exists && !info.isDirectory && info.modificationTime) {
        // modificationTime is in seconds since epoch in expo-file-system
        const fileAgeMs = now - (info.modificationTime * 1000)
        
        if (fileAgeMs > ONE_DAY_MS) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true })
          console.info(`[exportFileCache] Cleaned up stale export: ${file}`)
        }
      }
    }
  } catch (err) {
    console.warn('[exportFileCache] Failed to clean stale exports:', err)
    captureError(err, { source: 'exportFileCache.cleanStaleExports' })
  }
}
