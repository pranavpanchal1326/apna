import { createMMKV } from 'react-native-mmkv'

export interface QueuedPhoto {
  id: string              // unique identifier
  groupId: string
  userId: string
  localUri: string        // compressed local path
  destinationPath: string // Firebase Storage path
  context: 'memory' | 'receipt' | 'cover'
  memoryId?: string       // for memory context
  expenseId?: string      // for receipt context
  queuedAt: number        // unix ms
  attempts: number
  lastError?: string
}

const cameraStorage = createMMKV({ id: 'apna-camera' })
const QUEUE_KEY = 'photo_upload_queue'

function getQueue(): QueuedPhoto[] {
  const data = cameraStorage.getString(QUEUE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as QueuedPhoto[]
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedPhoto[]): void {
  cameraStorage.set(QUEUE_KEY, JSON.stringify(queue))
}

export const uploadQueue = {
  add(photo: Omit<QueuedPhoto, 'id' | 'queuedAt' | 'attempts'>): QueuedPhoto {
    const queue = getQueue()
    const newPhoto: QueuedPhoto = {
      ...photo,
      id: `${Math.random().toString(36).substring(7)}_${Date.now()}`,
      queuedAt: Date.now(),
      attempts: 0,
    }

    queue.push(newPhoto)

    // Limit to 50 items, drop the oldest (index 0 onwards)
    if (queue.length > 50) {
      queue.splice(0, queue.length - 50)
    }

    saveQueue(queue)
    return newPhoto
  },

  getAll(): QueuedPhoto[] {
    return getQueue()
  },

  remove(id: string): void {
    const queue = getQueue()
    const filtered = queue.filter((item) => item.id !== id)
    saveQueue(filtered)
  },

  markAttempt(id: string, error?: string): void {
    const queue = getQueue()
    const updated = queue.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          attempts: item.attempts + 1,
          lastError: error ?? 'Upload error',
        }
      }
      return item
    })
    saveQueue(updated)
  },

  clear(): void {
    cameraStorage.remove(QUEUE_KEY)
  },

  count(): number {
    return getQueue().length
  },
}
