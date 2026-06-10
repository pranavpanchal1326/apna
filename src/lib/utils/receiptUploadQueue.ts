// src/lib/utils/receiptUploadQueue.ts
// Offline receipt upload queue using react-native-mmkv.
// Retries pending uploads when the app is foregrounded.
// Enforces 5-attempt retry limit, notifies user on total failure, and manages UI store state.

import { createMMKV } from 'react-native-mmkv'
import { AppState, AppStateStatus, InteractionManager } from 'react-native'
import { uploadReceiptPhoto } from '../firebase/storage'
import { attachReceiptURL } from '../firebase/expenses'
import { useExpenseStore } from '../../stores/expense.store'
import { useUIStore } from '../../stores/ui.store'
import { captureError } from '../sentry'

const queueStorage = createMMKV({ id: 'apna-receipt-queue' })
const QUEUE_KEY = 'pending-uploads'

export interface QueuedUpload {
  groupId: string
  expenseId: string
  localUri: string
  createdAt: number
  attempts: number
  status: 'pending' | 'failed'
}

/**
 * Reads the current queue list from MMKV.
 */
export function getQueuedUploads(): QueuedUpload[] {
  const data = queueStorage.getString(QUEUE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Saves the queue list to MMKV.
 */
function saveQueue(queue: QueuedUpload[]) {
  queueStorage.set(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Enqueues a receipt for background/offline upload.
 */
export function enqueueReceiptUpload(groupId: string, expenseId: string, localUri: string) {
  const queue = getQueuedUploads()
  
  // Prevent duplicate queuing for the same expense
  if (queue.some((item) => item.expenseId === expenseId)) return

  const newItem: QueuedUpload = {
    groupId,
    expenseId,
    localUri,
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending',
  }

  queue.push(newItem)
  saveQueue(queue)

  // Track upload status in expense store
  useExpenseStore.setState((state) => ({
    receiptUploads: [
      ...state.receiptUploads,
      { expenseId, percent: 0, status: 'uploading' },
    ],
  }))

  // Trigger processing
  triggerQueueProcessing()
}

let isProcessing = false

/**
 * Triggers queue processing in a non-blocking background thread.
 */
export function triggerQueueProcessing() {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(async () => {
      await processQueue()
    }, 0)
  })
}

/**
 * Processes the queued receipt uploads.
 */
async function processQueue() {
  if (isProcessing) return
  isProcessing = true

  try {
    const queue = getQueuedUploads()
    const pendingItems = queue.filter((item) => item.status === 'pending')

    if (pendingItems.length === 0) {
      isProcessing = false
      return
    }

    for (const item of pendingItems) {
      // If attempts exceeded limit, skip and mark failed
      if (item.attempts >= 5) {
        item.status = 'failed'
        saveQueue(queue)
        
        useUIStore.getState().showToast({
          message: 'Receipt upload failed. Please try again from expense details.',
          type: 'error',
        })
        continue
      }

      item.attempts += 1
      saveQueue(queue)

      try {
        // Upload photo
        const downloadUrl = await uploadReceiptPhoto(
          item.groupId,
          item.expenseId,
          item.localUri,
          (percent) => {
            // Update local store upload progress
            useExpenseStore.setState((state) => ({
              receiptUploads: state.receiptUploads.map((u) =>
                u.expenseId === item.expenseId ? { ...u, percent, status: 'uploading' } : u
              ),
            }))
          }
        )

        // Save URL on Firestore document
        await attachReceiptURL(item.groupId, item.expenseId, downloadUrl)

        // Update local store with the resulting URL
        useExpenseStore.setState((state) => ({
          expensesByGroup: {
            ...state.expensesByGroup,
            [item.groupId]: (state.expensesByGroup[item.groupId] ?? []).map((e) =>
              e.id === item.expenseId ? { ...e, receiptUrl: downloadUrl } : e
            ),
          },
          receiptUploads: state.receiptUploads.map((u) =>
            u.expenseId === item.expenseId ? { ...u, percent: 100, status: 'done' } : u
          ),
        }))

        // Remove successfully uploaded item from MMKV queue
        const latestQueue = getQueuedUploads()
        const filtered = latestQueue.filter((qItem) => qItem.expenseId !== item.expenseId)
        saveQueue(filtered)
      } catch (err) {
        console.warn(`[receiptUploadQueue] Upload failed for ${item.expenseId} (attempt ${item.attempts}):`, err)
        captureError(err, { source: 'receiptUploadQueue.processItem', expenseId: item.expenseId })

        if (item.attempts >= 5) {
          item.status = 'failed'
          saveQueue(queue)

          useExpenseStore.setState((state) => ({
            receiptUploads: state.receiptUploads.map((u) =>
              u.expenseId === item.expenseId ? { ...u, status: 'error' } : u
            ),
          }))

          useUIStore.getState().showToast({
            message: 'Receipt upload failed after 5 attempts. Please check connection.',
            type: 'error',
          })
        }
      }
    }
  } catch (err) {
    captureError(err, { source: 'receiptUploadQueue.processQueue' })
  } finally {
    isProcessing = false
  }
}

/**
 * Initializes AppState listener and triggers initial processing.
 */
export function initializeUploadQueue() {
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      triggerQueueProcessing()
    }
  })

  // Trigger on initialization
  triggerQueueProcessing()
}
