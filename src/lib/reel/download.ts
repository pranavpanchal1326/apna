// src/lib/reel/download.ts
// Download and normalize remote memory photos for rendering.

import * as FileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import { REEL_OUTPUT } from './config'
import type { ReelClip } from './types'
import { trackReelTempFile } from './tempFiles'

export async function prepareClipMedia(
  clip: ReelClip,
  workDir: string,
  jobId: string,
  index: number,
): Promise<string> {
  if (clip.localUri) {
    return normalizeImage(clip.localUri, workDir, index, jobId)
  }

  if (!clip.remoteUrl) {
    throw new Error('missing_media')
  }

  const rawPath = `${workDir}raw-${index}.jpg`
  const download = await FileSystem.downloadAsync(clip.remoteUrl, rawPath)
  trackReelTempFile(jobId, download.uri)
  return normalizeImage(download.uri, workDir, index, jobId)
}

async function normalizeImage(
  sourceUri: string,
  workDir: string,
  index: number,
  jobId: string,
): Promise<string> {
  const outputPath = `${workDir}frame-${String(index).padStart(2, '0')}.jpg`

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      {
        resize: {
          width: REEL_OUTPUT.width,
          height: REEL_OUTPUT.height,
        },
      },
    ],
    {
      compress: 0.88,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  )

  await FileSystem.copyAsync({ from: result.uri, to: outputPath })
  trackReelTempFile(jobId, outputPath)
  return outputPath
}

export async function prepareAllClipMedia(
  clips: ReelClip[],
  workDir: string,
  jobId: string,
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < clips.length; i++) {
    paths.push(await prepareClipMedia(clips[i], workDir, jobId, i))
  }
  return paths
}
