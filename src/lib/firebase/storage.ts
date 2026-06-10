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
