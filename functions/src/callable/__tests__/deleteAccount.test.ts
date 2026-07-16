// Unit tests for the pure helpers in deleteAccount.ts.
// The callable itself needs the emulator (integration) — these cover the
// URL-parsing and admin-promotion logic that must not regress.

import { storagePathFromUrl, pickNewAdmin } from '../deleteAccount'

describe('storagePathFromUrl', () => {
  it('extracts and decodes the object path from a download URL', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/apna-app.appspot.com/o/groups%2Fg1%2Fmemories%2Fm1%2Fphoto_0.jpg?alt=media&token=abc123'
    expect(storagePathFromUrl(url)).toBe('groups/g1/memories/m1/photo_0.jpg')
  })

  it('handles URLs without a query string', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Favatar%2Fa.jpg'
    expect(storagePathFromUrl(url)).toBe('users/u1/avatar/a.jpg')
  })

  it('returns null for URLs that are not storage download URLs', () => {
    expect(storagePathFromUrl('https://example.com/photo.jpg')).toBeNull()
    expect(storagePathFromUrl('')).toBeNull()
  })

  it('returns null when the encoded path is malformed', () => {
    expect(storagePathFromUrl('https://x.com/o/%E0%A4%A?alt=media')).toBeNull()
  })
})

describe('pickNewAdmin', () => {
  const ts = (millis: number) => ({ toMillis: () => millis }) as never

  it('promotes the earliest-joined remaining member', () => {
    const members = {
      leaving: { role: 'admin', joinedAt: ts(100) },
      later: { role: 'member', joinedAt: ts(3000) },
      earliest: { role: 'member', joinedAt: ts(2000) },
    }
    expect(pickNewAdmin(members, 'leaving')).toBe('earliest')
  })

  it('never promotes the departing user', () => {
    const members = { leaving: { role: 'admin', joinedAt: ts(1) } }
    expect(pickNewAdmin(members, 'leaving')).toBeNull()
  })

  it('still picks someone when joinedAt is missing', () => {
    const members = {
      leaving: { role: 'admin', joinedAt: ts(1) },
      other: { role: 'member' },
    }
    expect(pickNewAdmin(members, 'leaving')).toBe('other')
  })

  it('prefers a member with joinedAt over one without', () => {
    const members = {
      leaving: { role: 'admin', joinedAt: ts(1) },
      noDate: { role: 'member' },
      dated: { role: 'member', joinedAt: ts(500) },
    }
    expect(pickNewAdmin(members, 'leaving')).toBe('dated')
  })
})
