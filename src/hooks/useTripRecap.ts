// src/hooks/useTripRecap.ts
// Public recap generation + visibility for Trip Wrap screen.

import { useCallback, useState } from 'react'
import {
  generateTripRecap,
  updateRecapVisibility,
  getRecapPublicUrl,
} from '@lib/firebase/tripRecap'
import type {
  PublicRecap,
  RecapGenerationOptions,
  RecapVisibility,
} from '@lib/schemas/publicRecap.schema'

export function useTripRecap(groupId: string) {
  const [publicRecap, setPublicRecap] = useState<PublicRecap | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)

  const createPublicRecap = useCallback(
    async (options?: RecapGenerationOptions) => {
      setIsGenerating(true)
      setGenerateError(null)
      setShareSuccess(false)
      try {
        const result = await generateTripRecap(groupId, options)
        if (!result.success || !result.recap) {
          setGenerateError(
            result.message === 'insufficient_data'
              ? 'Add memories, places, or trip dates before sharing a recap.'
              : 'Could not generate recap. Try again.',
          )
          return null
        }
        setPublicRecap(result.recap)
        return result.recap
      } catch {
        setGenerateError('Could not reach the server. Check your connection and retry.')
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [groupId],
  )

  const setVisibility = useCallback(
    async (visibility: RecapVisibility) => {
      if (!publicRecap) return false
      const ok = await updateRecapVisibility(publicRecap.shareSlug, visibility)
      if (ok) {
        setPublicRecap({ ...publicRecap, visibility, isPublic: visibility === 'public' })
      }
      return ok
    },
    [publicRecap],
  )

  const publicUrl = publicRecap ? getRecapPublicUrl(publicRecap) : null

  return {
    publicRecap,
    isGenerating,
    generateError,
    shareSuccess,
    setShareSuccess,
    publicUrl,
    createPublicRecap,
    setVisibility,
  }
}
