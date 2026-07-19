// src/lib/memories/saveToGallery.ts
// Download a memory photo and save it to the device camera roll (PRD §12).

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { captureError } from '@lib/sentry'
import { track } from '@lib/analytics'

let MediaLibrary: typeof import('expo-media-library') | null = null
if (Platform.OS !== 'web') {
  MediaLibrary = require('expo-media-library')
}

export type SaveToGalleryResult = 'saved' | 'permission_denied' | 'error'

/**
 * Downloads a remote photo URL to a temp file and saves it to the camera roll.
 * Returns a result code so callers can show the right message.
 */
export async function savePhotoToGallery(url: string): Promise<SaveToGalleryResult> {
  try {
    if (Platform.OS === 'web' || !MediaLibrary) {
      return 'permission_denied'
    }
    // Ask for add-only access where the platform supports it (Android 10+/iOS 14+)
    const permission = await MediaLibrary.requestPermissionsAsync(true)
    if (!permission.granted) {
      return 'permission_denied'
    }

    const tempPath = `${FileSystem.cacheDirectory}memory-save-${Date.now()}.jpg`
    const download = await FileSystem.downloadAsync(url, tempPath)
    await MediaLibrary.saveToLibraryAsync(download.uri)

    // Best-effort temp cleanup — the photo is already in the gallery
    FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => {})

    track('memory_photo_saved')
    return 'saved'
  } catch (err) {
    captureError(err, { source: 'savePhotoToGallery' })
    return 'error'
  }
}
