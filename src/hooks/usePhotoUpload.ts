import { useState, useRef, useEffect, useCallback } from 'react'
import { compressPhoto, cleanOldTempFiles } from '../lib/camera/compression'
import { uploadQueue } from '../lib/camera/uploadQueue'
import {
  uploadPhotoWithProgress,
  buildMemoryPhotoPath,
  buildReceiptPhotoPath,
  buildGroupCoverPath,
  UploadPhotoResult,
} from '../lib/firebase/storage'
import { captureError } from '../lib/sentry'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase/config'

export interface PhotoUploadState {
  isUploading: boolean
  progress: number          // 0–100 overall across all photos
  uploadedCount: number
  totalCount: number
  error: string | null
  results: UploadPhotoResult[]
}

export interface UsePhotoUploadResult {
  state: PhotoUploadState
  uploadPhotos(params: {
    localUris: string[]
    context: 'memory' | 'receipt' | 'cover'
    groupId: string
    referenceId: string     // memoryId, expenseId, or groupId
  }): Promise<UploadPhotoResult[]>
  cancelUpload(): void
  retryFailed(): Promise<void>
  processQueue(): Promise<void>
}

export function usePhotoUpload(): UsePhotoUploadResult {
  const [state, setState] = useState<PhotoUploadState>({
    isUploading: false,
    progress: 0,
    uploadedCount: 0,
    totalCount: 0,
    error: null,
    results: [],
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Clean old temp files on mount, and trigger initial queue processing
  useEffect(() => {
    cleanOldTempFiles()
    processQueue()
  }, [])

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: 'Upload cancelled by user',
      }))
    }
  }, [])

  const processQueue = useCallback(async () => {
    const queued = uploadQueue.getAll()
    if (queued.length === 0) return

    for (const item of queued) {
      try {
        // Double check if file still exists before attempting upload
        const result = await uploadPhotoWithProgress({
          localUri: item.localUri,
          storagePath: item.destinationPath,
        })

        // Success: Patch Firestore document
        if (item.context === 'memory' && item.memoryId) {
          const docRef = doc(db, `groups/${item.groupId}/memories`, item.memoryId)
          await updateDoc(docRef, {
            photoUrl: result.downloadUrl,
            uploadPending: false,
          })
        } else if (item.context === 'receipt' && item.expenseId) {
          const docRef = doc(db, `groups/${item.groupId}/expenses`, item.expenseId)
          await updateDoc(docRef, {
            receiptUrl: result.downloadUrl,
            uploadPending: false,
          })
        } else if (item.context === 'cover') {
          const docRef = doc(db, 'groups', item.groupId)
          await updateDoc(docRef, {
            coverPhotoUrl: result.downloadUrl,
          })
        }

        uploadQueue.remove(item.id)
      } catch (err) {
        uploadQueue.markAttempt(item.id, (err as Error).message)
      }
    }
  }, [])

  const uploadPhotos = useCallback(
    async (params: {
      localUris: string[]
      context: 'memory' | 'receipt' | 'cover'
      groupId: string
      referenceId: string
    }): Promise<UploadPhotoResult[]> => {
      const { localUris, context, groupId, referenceId } = params
      if (localUris.length === 0) return []

      // Cancel any ongoing upload first
      cancelUpload()

      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setState({
        isUploading: true,
        progress: 0,
        uploadedCount: 0,
        totalCount: localUris.length,
        error: null,
        results: [],
      })

      const finalResults: UploadPhotoResult[] = []

      for (let i = 0; i < localUris.length; i++) {
        const localUri = localUris[i]
        if (!localUri) continue

        // Build storage path
        let storagePath = ''
        if (context === 'memory') {
          storagePath = buildMemoryPhotoPath({ groupId, memoryId: referenceId, index: i })
        } else if (context === 'receipt') {
          storagePath = buildReceiptPhotoPath({ groupId, expenseId: referenceId })
        } else if (context === 'cover') {
          storagePath = buildGroupCoverPath({ groupId })
        }

        try {
          // 1. Client side compression (limit 2MB per photo)
          const compResult = await compressPhoto({ uri: localUri })

          // 2. Upload with progress
          const uploadResult = await uploadPhotoWithProgress({
            localUri: compResult.uri,
            storagePath,
            onProgress: (percent) => {
              setState((prev) => {
                const completed = prev.uploadedCount
                const currentContribution = percent / localUris.length
                const overallProgress = Math.round((completed * 100) / localUris.length + currentContribution)
                return {
                  ...prev,
                  progress: Math.min(100, Math.max(0, overallProgress)),
                }
              });
            },
            signal,
          })

          finalResults.push(uploadResult)
          setState((prev) => ({
            ...prev,
            uploadedCount: prev.uploadedCount + 1,
            results: [...prev.results, uploadResult],
          }))
        } catch (err) {
          // If aborted, stop immediately
          if (signal.aborted) {
            break
          }

          captureError(err as Error, { source: 'usePhotoUpload.uploadPhotos', localUri })

          // On network failure or similar, enqueue offline
          // We can construct the document sub-ID for memory context
          const docIdForQueue = context === 'memory' ? `${referenceId}_${i}` : referenceId

          uploadQueue.add({
            groupId,
            userId: referenceId, // Or actual auth user id? Let's check: queue expects userId.
            localUri,
            destinationPath: storagePath,
            context,
            memoryId: context === 'memory' ? docIdForQueue : undefined,
            expenseId: context === 'receipt' ? referenceId : undefined,
          })

          setState((prev) => ({
            ...prev,
            error: prev.error ? `${prev.error}; Failed uploading index ${i}` : `Failed uploading index ${i}`,
          }))
        }
      }

      setState((prev) => ({
        ...prev,
        isUploading: false,
      }))

      // Process queue to check for connection restoration
      processQueue()

      return finalResults
    },
    [cancelUpload, processQueue]
  )

  const retryFailed = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isUploading: true,
      error: null,
    }))
    try {
      await processQueue()
      setState((prev) => ({
        ...prev,
        isUploading: false,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: (err as Error).message,
      }))
    }
  }, [processQueue])

  return {
    state,
    uploadPhotos,
    cancelUpload,
    retryFailed,
    processQueue,
  }
}
