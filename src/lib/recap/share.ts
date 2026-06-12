// src/lib/recap/share.ts
// Share delivery layer — image capture + native share sheet + optional link.

import { Alert, Share, Platform } from 'react-native'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { captureRef } from 'react-native-view-shot'
import type { RefObject } from 'react'
import type { View } from 'react-native'
import type { PublicRecap } from '@lib/schemas/publicRecap.schema'
import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'

const RECAP_BASE_URL = 'https://apna.app/recap'

export function buildPublicRecapUrl(shareSlug: string): string {
  return `${RECAP_BASE_URL}/${shareSlug}`
}

export function buildRecapShareMessage(recap: PublicRecap): string {
  const place = recap.destination ? ` in ${recap.destination}` : ''
  const url = buildPublicRecapUrl(recap.shareSlug)
  return `Our trip "${recap.tripName}"${place} — recap on apna. Plan trips, split costs, and keep memories together.\n\n${url}`
}

async function copyCaptureToCache(localUri: string, slug: string): Promise<string> {
  const dir = `${FileSystem.cacheDirectory}apna-recaps/`
  const dirInfo = await FileSystem.getInfoAsync(dir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
  const dest = `${dir}apna-recap-${slug}.jpg`
  await FileSystem.copyAsync({ from: localUri, to: dest })
  return dest
}

export interface ShareRecapResult {
  success: boolean
  exportType: 'image_only' | 'image_and_link' | 'failed'
}

export async function shareRecapCard(params: {
  cardRef: RefObject<View | null>
  recap: PublicRecap
  includeLink?: boolean
}): Promise<ShareRecapResult> {
  const { cardRef, recap, includeLink = true } = params

  if (!cardRef.current) {
    track('trip_recap_export_failed', {
      reason: 'card_not_ready',
      visibility: recap.visibility,
    })
    return { success: false, exportType: 'failed' }
  }

  try {
    track('trip_recap_rendered', {
      visibility: recap.visibility,
      member_count: recap.memberCount,
      memories_count: recap.memoriesCount,
      template: recap.template,
    })

    const localUri = await captureRef(cardRef, {
      format: 'jpg',
      quality: 0.92,
    })

    const cachedUri = await copyCaptureToCache(localUri, recap.shareSlug)
    const message = includeLink ? buildRecapShareMessage(recap) : undefined

    track('trip_recap_share_sheet_opened', {
      visibility: recap.visibility,
      export_type: includeLink ? 'image_and_link' : 'image_only',
      member_count: recap.memberCount,
    })

    if (Platform.OS === 'ios' && message) {
      await Share.share({ message, url: cachedUri })
    } else if (message) {
      const sharingAvailable = await Sharing.isAvailableAsync()
      if (sharingAvailable) {
        await Sharing.shareAsync(cachedUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Trip Recap',
        })
        await Share.share({ message })
      } else {
        await Share.share({ message: `${message}\n\n(Image saved locally)` })
      }
    } else {
      const sharingAvailable = await Sharing.isAvailableAsync()
      if (!sharingAvailable) {
        throw new Error('sharing_unavailable')
      }
      await Sharing.shareAsync(cachedUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share Trip Recap',
      })
    }

    track('trip_recap_shared', {
      visibility: recap.visibility,
      export_type: includeLink ? 'image_and_link' : 'image_only',
      member_count: recap.memberCount,
      memories_count: recap.memoriesCount,
      places_count: recap.placesCount,
      include_spend: recap.includeSpend,
    })

    return {
      success: true,
      exportType: includeLink ? 'image_and_link' : 'image_only',
    }
  } catch (err) {
    captureError(err, { source: 'recap.shareRecapCard' })
    track('trip_recap_export_failed', {
      reason: err instanceof Error ? err.message : 'unknown',
      visibility: recap.visibility,
    })
    Alert.alert(
      'Could not share recap',
      'Something went wrong while exporting your card. Try again in a moment.',
      [{ text: 'OK' }],
    )
    return { success: false, exportType: 'failed' }
  }
}
