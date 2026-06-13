// src/lib/firebase/storage.ts
// Firebase Storage operations for receipt photo upload.
// Storage path: groups/{groupId}/receipts/{expenseId}_{timestamp}.jpg
// Enforces 5MB limit client-side.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './config'
import { captureError } from '@lib/sentry'

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024   // 5MB

/**
 * Uploads a compressed receipt photo to Firebase Storage.
 * Generates a filename according to groups/{groupId}/receipts/{expenseId}_{timestamp}.jpg.
 * Returns a Promise that resolves to the download URL, or throws on failure.
 */
export async function uploadReceiptPhoto(
  groupId: string,
  expenseId: string,
  compressedUri: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const timestamp = Date.now()
  const filename = `${expenseId}_${timestamp}.jpg`
  const path = `groups/${groupId}/receipts/${filename}`
  const storageRef = ref(storage, path)

  // Convert local URI to Blob
  const response = await fetch(compressedUri)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: { groupId, expenseId },
    })

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || 1
        const percent = Math.round(
          (snapshot.bytesTransferred / total) * 100
        )
        onProgress(percent)
      },
      (err) => {
        captureError(err, { source: 'uploadReceiptPhoto', groupId, expenseId })
        reject(err)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        } catch (err) {
          captureError(err, { source: 'uploadReceiptPhoto.complete', groupId, expenseId })
          reject(err)
        }
      }
    )
  })
}

/**
 * Deletes a receipt photo from Firebase Storage.
 */
export async function deleteReceiptPhoto(receiptUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, receiptUrl)
    await deleteObject(storageRef)
  } catch (err) {
    // Ignore not-found errors (photo may have been deleted already)
    captureError(err, { source: 'deleteReceiptPhoto', receiptUrl })
  }
}

// Keep legacy compatibility wrapper if needed
export async function deleteReceipt(receiptURL: string): Promise<void> {
  return deleteReceiptPhoto(receiptURL)
}

/**
 * Uploads a memory photo to Firebase Storage.
 * Path: groups/{groupId}/memories/{memoryId}_{timestamp}.jpg
 */
export async function uploadMemoryPhoto(
  groupId: string,
  memoryId: string,
  compressedUri: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const timestamp = Date.now()
  const filename = `${memoryId}_${timestamp}.jpg`
  const path = `groups/${groupId}/memories/${filename}`
  const storageRef = ref(storage, path)

  // Convert local URI to Blob
  const response = await fetch(compressedUri)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: { groupId, memoryId },
    })

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || 1
        const percent = Math.round(
          (snapshot.bytesTransferred / total) * 100
        )
        onProgress?.(percent)
      },
      (err) => {
        captureError(err, { source: 'uploadMemoryPhoto', groupId, memoryId })
        reject(err)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        } catch (err) {
          captureError(err, { source: 'uploadMemoryPhoto.complete', groupId, memoryId })
          reject(err)
        }
      }
    )
  })
}

/**
 * Deletes a memory photo from Firebase Storage.
 */
export async function deleteMemoryPhoto(photoUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, photoUrl)
    await deleteObject(storageRef)
  } catch (err) {
    captureError(err, { source: 'deleteMemoryPhoto', photoUrl })
  }
}

export interface UploadPhotoResult {
  downloadUrl: string
  storagePath: string
  fileSizeBytes: number
}

/**
 * Resumable upload task with progress tracking and abort controller support.
 */
export async function uploadPhotoWithProgress(params: {
  localUri: string
  storagePath: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}): Promise<UploadPhotoResult> {
  const { localUri, storagePath, onProgress, signal } = params
  const storageRef = ref(storage, storagePath)

  // Fetch localUri to get blob
  const response = await fetch(localUri)
  const blob = await response.blob()
  const fileSizeBytes = blob.size

  return new Promise<UploadPhotoResult>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    })

    const onAbort = () => {
      uploadTask.cancel()
      reject(new Error('Upload aborted'))
    }

    if (signal) {
      signal.addEventListener('abort', onAbort)
    }

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || 1
        const percent = Math.round((snapshot.bytesTransferred / total) * 100)
        onProgress?.(percent)
      },
      (err) => {
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        captureError(err, { source: 'uploadPhotoWithProgress', storagePath })
        reject(err)
      },
      async () => {
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
          resolve({
            downloadUrl,
            storagePath,
            fileSizeBytes,
          })
        } catch (err) {
          captureError(err as Error, { source: 'uploadPhotoWithProgress.complete', storagePath })
          reject(err)
        }
      }
    )
  })
}

/**
 * Returns a time-limited download URL on the client.
 */
export async function getSignedUrl(params: {
  storagePath: string
  expirySeconds?: number   // default 86400 (24 hours)
}): Promise<string> {
  const storageRef = ref(storage, params.storagePath)
  return getDownloadURL(storageRef)
}

export function buildMemoryPhotoPath(params: {
  groupId: string
  memoryId: string
  index: number
}): string {
  return `groups/${params.groupId}/memories/${params.memoryId}/photo_${params.index}.jpg`
}

export function buildReceiptPhotoPath(params: {
  groupId: string
  expenseId: string
}): string {
  return `groups/${params.groupId}/receipts/${params.expenseId}.jpg`
}

export function buildGroupCoverPath(params: {
  groupId: string
}): string {
  // We use groups/{groupId}/cover/cover.jpg to match the storage rules path: groups/{groupId}/cover/{allPaths=**}
  return `groups/${params.groupId}/cover/cover.jpg`
}


