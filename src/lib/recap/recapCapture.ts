// src/lib/recap/recapCapture.ts
// Deep link listener for public recap landing pages.

import * as Linking from 'expo-linking'
import { track } from '@lib/analytics'

const RECAP_PATH_RE = /\/recap\/([A-Za-z0-9][A-Za-z0-9-]{3,62})/i

export function parseRecapSlugFromUrl(url: string): string | null {
  if (!url) return null
  const match = url.trim().match(RECAP_PATH_RE)
  return match?.[1]?.toLowerCase() ?? null
}

export function initRecapDeepLinkCapture(
  onSlug: (slug: string) => void,
): () => void {
  const handleUrl = (url: string | null) => {
    if (!url) return
    const slug = parseRecapSlugFromUrl(url)
    if (!slug) return

    track('trip_recap_public_link_opened', { share_slug: slug })
    onSlug(slug)
  }

  Linking.getInitialURL().then(handleUrl)
  const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url))
  return () => subscription.remove()
}
