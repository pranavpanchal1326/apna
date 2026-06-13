import * as FileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'

export interface CompressionResult {
  uri: string
  width: number
  height: number
  fileSizeBytes: number
  compressionApplied: boolean
}

/**
 * Client-side photo compression.
 * If already under size AND shorter dimension <= maxDimension, return as-is.
 * Otherwise, resize to fit within maxDimension and run progressive quality passes (82% -> 65% -> 50%).
 */
export async function compressPhoto(params: {
  uri: string
  maxSizeBytes?: number     // default 2_000_000 (2MB)
  maxDimension?: number     // default 1920px on longest edge
}): Promise<CompressionResult> {
  const uri = params.uri
  const maxSizeBytes = params.maxSizeBytes ?? 2000000
  const maxDimension = params.maxDimension ?? 1920

  // 1. Read file size
  const info = await FileSystem.getInfoAsync(uri)
  if (!info.exists) {
    throw new Error('File does not exist: ' + uri)
  }

  const initialSize = info.size ?? 0

  // Get initial dimensions using empty manipulation
  const initialResult = await ImageManipulator.manipulateAsync(uri, [])
  const { width, height } = initialResult
  const shorterDimension = Math.min(width, height)

  // 2. If already under size AND shorter dimension <= maxDimension, return as-is
  if (initialSize <= maxSizeBytes && shorterDimension <= maxDimension) {
    return {
      uri,
      width,
      height,
      fileSizeBytes: initialSize,
      compressionApplied: false,
    }
  }

  // Ensure output directory exists
  const targetDir = FileSystem.cacheDirectory + 'apna_compressed/'
  const dirInfo = await FileSystem.getInfoAsync(targetDir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true })
  }

  // 3. Resize to fit within maxDimension maintaining aspect ratio
  const actions: ImageManipulator.Action[] = []
  const longerEdge = Math.max(width, height)

  if (longerEdge > maxDimension) {
    if (width > height) {
      actions.push({ resize: { width: maxDimension } })
    } else {
      actions.push({ resize: { height: maxDimension } })
    }
  }

  // Helper to run manipulation and measure size
  const runPass = async (quality: number): Promise<CompressionResult> => {
    const manipResult = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    })

    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
    const destUri = targetDir + filename
    await FileSystem.moveAsync({
      from: manipResult.uri,
      to: destUri,
    })

    const fileInfo = await FileSystem.getInfoAsync(destUri)
    return {
      uri: destUri,
      width: manipResult.width,
      height: manipResult.height,
      fileSizeBytes: fileInfo.exists ? (fileInfo.size ?? 0) : 0,
      compressionApplied: true,
    }
  }

  // Pass 1: 0.82
  let result = await runPass(0.82)
  if (result.fileSizeBytes <= maxSizeBytes) {
    return result
  }

  // Pass 2: 0.65
  const prevUri1 = result.uri
  result = await runPass(0.65)
  await FileSystem.deleteAsync(prevUri1, { idempotent: true })
  if (result.fileSizeBytes <= maxSizeBytes) {
    return result
  }

  // Pass 3: 0.50 (Never go below 0.50 quality)
  const prevUri2 = result.uri
  result = await runPass(0.50)
  await FileSystem.deleteAsync(prevUri2, { idempotent: true })
  return result
}

/**
 * Best-effort clean up of compressed temp files older than 1 hour.
 */
export async function cleanOldTempFiles(): Promise<void> {
  try {
    const dir = FileSystem.cacheDirectory + 'apna_compressed/'
    const dirInfo = await FileSystem.getInfoAsync(dir)
    if (!dirInfo.exists) return

    const files = await FileSystem.readDirectoryAsync(dir)
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    for (const file of files) {
      const fileUri = dir + file
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists && !fileInfo.isDirectory) {
        let modTime = fileInfo.modificationTime ?? 0
        if (modTime > 0) {
          // Standardize unix timestamp to milliseconds if in seconds
          if (modTime < 100000000000) {
            modTime *= 1000
          }
          if (now - modTime > oneHour) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true })
          }
        }
      }
    }
  } catch (err) {
    // Ignore error for best-effort operation
  }
}
