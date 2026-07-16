// functions/src/utils/storageUrl.ts
// Shared helpers for translating Firebase download URLs ↔ storage paths
// and minting short-lived signed URLs (PRD §23 — 24h expiry on shared photos).

import * as admin from 'firebase-admin'

export const SIGNED_URL_TTL_MS = 24 * 60 * 60 * 1000

/** Extracts the storage object path from a Firebase download URL, or null. */
export function storagePathFromUrl(url: string): string | null {
  // Download URLs look like: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?alt=media&token=…
  const match = /\/o\/([^?]+)/.exec(url)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

/**
 * Signs storage paths into 24h V4 read URLs. Falls back to the provided
 * original URL (or drops the entry) when signing fails, so recap generation
 * never breaks on missing IAM permissions or emulator runs.
 */
export async function signPhotoPaths(
  paths: string[],
  fallbackUrls: string[] = [],
): Promise<string[]> {
  const bucket = admin.storage().bucket()
  const expires = Date.now() + SIGNED_URL_TTL_MS
  const results: string[] = []
  for (let i = 0; i < paths.length; i++) {
    try {
      const [url] = await bucket.file(paths[i]).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires,
      })
      results.push(url)
    } catch (err) {
      console.warn(`[apna] signPhotoPaths: signing failed for ${paths[i]}:`, err)
      if (fallbackUrls[i]) results.push(fallbackUrls[i])
    }
  }
  return results
}
