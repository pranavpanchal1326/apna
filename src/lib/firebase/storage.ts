// src/lib/firebase/storage.ts
// Firebase Storage operations — receipt photo upload.
// Upload is non-blocking: expense is saved first, then photo uploads
// in background. On completion, receiptUrl is patched onto the expense doc.
//
// Storage path: receipts/{groupId}/{expenseId}/{timestamp}.jpg
// Max file size: 5MB (enforced client-side before upload)
// Image is compressed to max 1200px wide before upload (expo-image-manipulator)

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './config'
import { attachReceiptURL } from './expenses'
import { captureError } from '@lib/sentry'

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024   // 5MB
export const MAX_RECEIPT_DIMENSION  = 1200               // px

export interface UploadProgress {
  bytesTransferred: number
  totalBytes:       number
  percent:          number
}

// ── Upload receipt photo ───────────────────────────────────────────
// Non-blocking: returns immediately after starting upload.
// Calls onProgress during upload, then patches expenseDoc with URL on complete.
// Errors are logged to Sentry but NOT thrown — receipt upload failure is
// non-critical (expense is already saved).
export function uploadReceipt(params: {
  groupId:    string
  expenseId:  string
  localUri:   string       // expo-image-picker result URI
  blob:       Blob
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (downloadURL: string) => void
  onError?:    (err: Error) => void
}): () => void {   // Returns cancel function
  const { groupId, expenseId, blob, onProgress, onComplete, onError } = params

  const path      = `receipts/${groupId}/${expenseId}/${Date.now()}.jpg`
  const storageRef = ref(storage, path)

  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
    customMetadata: { groupId, expenseId },
  })

  uploadTask.on(
    'state_changed',
    (snapshot) => {
      const percent = Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      )
      onProgress?.({
        bytesTransferred: snapshot.bytesTransferred,
        totalBytes:       snapshot.totalBytes,
        percent,
      })
    },
    (err) => {
      captureError(err, { source: 'uploadReceipt', groupId, expenseId })
      onError?.(err)
    },
    async () => {
      try {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
        // Patch expense document with receipt URL (matching the receiptUrl schema property)
        await attachReceiptURL(groupId, expenseId, downloadURL)
        onComplete?.(downloadURL)
      } catch (err) {
        captureError(err, { source: 'uploadReceipt.complete', groupId, expenseId })
        onError?.(err as Error)
      }
    }
  )

  // Return cancel function
  return () => uploadTask.cancel()
}

// ── Delete receipt photo ───────────────────────────────────────────
export async function deleteReceipt(receiptURL: string): Promise<void> {
  try {
    const storageRef = ref(storage, receiptURL)
    await deleteObject(storageRef)
  } catch (err) {
    // Ignore not-found errors (photo may have been deleted already)
    captureError(err, { source: 'deleteReceipt' })
  }
}
