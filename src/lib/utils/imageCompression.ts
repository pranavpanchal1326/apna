// src/lib/utils/imageCompression.ts
// Pure client-side image compression utility using expo-image-manipulator.
// Caps image dimensions and adjusts JPEG quality in multiple passes to ensure
// the final image is under 5MB (Firebase Storage security rules limit).

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

const FIVE_MB = 5 * 1024 * 1024 // 5,242,880 bytes

/**
 * Compresses an image at the given local URI.
 * First pass: resize to max width 1500px, 80% quality.
 * Second pass (if >5MB): resize to max width 1500px, 60% quality.
 * Third pass (if still >5MB): resize to max width 1000px, 60% quality.
 * 
 * Returns the final compressed local URI and the byte size.
 */
export async function compressReceiptImage(
  uri: string
): Promise<{ uri: string; sizeBytes: number }> {
  // 1. Inspect original dimensions
  const originalInfo = await manipulateAsync(uri, [], { format: SaveFormat.JPEG })
  const originalWidth = originalInfo.width

  // Cap initial width at 1500px
  let targetWidth = originalWidth > 1500 ? 1500 : originalWidth

  // Pass 1: Max 1500px width @ 80% JPEG quality
  let manipResult = await manipulateAsync(
    uri,
    [{ resize: { width: targetWidth } }],
    { compress: 0.8, format: SaveFormat.JPEG }
  )

  // Get size of Pass 1 output
  let sizeBytes = await getUriSizeBytes(manipResult.uri)

  // Pass 2: If size > 5MB, drop quality to 60%
  if (sizeBytes > FIVE_MB) {
    manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: targetWidth } }],
      { compress: 0.6, format: SaveFormat.JPEG }
    )
    sizeBytes = await getUriSizeBytes(manipResult.uri)
  }

  // Pass 3: If still > 5MB, drop width to 1000px and quality to 60%
  if (sizeBytes > FIVE_MB) {
    targetWidth = originalWidth > 1000 ? 1000 : originalWidth
    manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: targetWidth } }],
      { compress: 0.6, format: SaveFormat.JPEG }
    )
    sizeBytes = await getUriSizeBytes(manipResult.uri)
  }

  return {
    uri: manipResult.uri,
    sizeBytes,
  }
}

/**
 * Helper to fetch the size of a local URI in bytes.
 * Uses the fetch-blob pattern appropriate for React Native.
 */
async function getUriSizeBytes(uri: string): Promise<number> {
  try {
    const res = await fetch(uri)
    const blob = await res.blob()
    return blob.size
  } catch (err) {
    console.error('[imageCompression] Failed to calculate size for URI:', uri, err)
    return 0
  }
}
