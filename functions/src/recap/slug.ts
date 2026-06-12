// functions/src/recap/slug.ts
// Readable share slugs — separate from internal Firestore IDs.

const SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function slugifyTripName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'trip'
}

export function randomSlugSuffix(length = 4): string {
  let suffix = ''
  for (let i = 0; i < length; i++) {
    suffix += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)]
  }
  return suffix
}

export function buildShareSlug(tripName: string, existingSlug?: string): string {
  if (existingSlug) return existingSlug
  return `${slugifyTripName(tripName)}-${randomSlugSuffix()}`
}
