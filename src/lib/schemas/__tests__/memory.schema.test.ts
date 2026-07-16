// src/lib/schemas/__tests__/memory.schema.test.ts
// Multi-photo memory schema + legacy normalizer tests.

import {
  MemorySchema,
  MEMORY_MAX_PHOTOS,
  getMemoryPhotos,
  getMemoryCoverUrl,
  getMemoryThumbUrl,
  memoryHasPhoto,
} from '../memory.schema'

const base = {
  id: 'mem1',
  groupId: 'g1',
  type: 'photo' as const,
  date: '2026-07-16',
  createdBy: 'u1',
  createdAt: null,
}

describe('MemorySchema — photos[]', () => {
  it('accepts a multi-photo memory', () => {
    const result = MemorySchema.safeParse({
      ...base,
      photos: [{ url: 'https://x.com/a.jpg' }, { url: 'https://x.com/b.jpg', thumb: 'https://x.com/b_t.jpg' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts pending photos with empty url', () => {
    const result = MemorySchema.safeParse({
      ...base,
      photos: [{ url: '' }],
      uploadPending: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than MEMORY_MAX_PHOTOS photos', () => {
    const photos = Array.from({ length: MEMORY_MAX_PHOTOS + 1 }, (_, i) => ({
      url: `https://x.com/${i}.jpg`,
    }))
    expect(MemorySchema.safeParse({ ...base, photos }).success).toBe(false)
  })

  it('still accepts legacy single-photo docs', () => {
    const result = MemorySchema.safeParse({
      ...base,
      photoUrl: 'https://x.com/legacy.jpg',
    })
    expect(result.success).toBe(true)
  })
})

describe('photo normalizers', () => {
  const legacy = { photoUrl: 'https://x.com/l.jpg', photoThumb: 'https://x.com/l_t.jpg' }
  const multi = {
    photos: [
      { url: 'https://x.com/1.jpg', thumb: 'https://x.com/1_t.jpg' },
      { url: 'https://x.com/2.jpg' },
      { url: '' }, // pending upload
    ],
  }

  it('getMemoryPhotos maps legacy fields to a one-element array', () => {
    expect(getMemoryPhotos(legacy)).toEqual([{ url: 'https://x.com/l.jpg', thumb: 'https://x.com/l_t.jpg' }])
  })

  it('getMemoryPhotos filters pending (empty-url) photos', () => {
    expect(getMemoryPhotos(multi)).toHaveLength(2)
  })

  it('getMemoryPhotos prefers photos[] over legacy fields', () => {
    expect(getMemoryPhotos({ ...multi, ...legacy })[0].url).toBe('https://x.com/1.jpg')
  })

  it('getMemoryCoverUrl returns first uploaded url', () => {
    expect(getMemoryCoverUrl(multi)).toBe('https://x.com/1.jpg')
    expect(getMemoryCoverUrl(legacy)).toBe('https://x.com/l.jpg')
    expect(getMemoryCoverUrl({})).toBeUndefined()
  })

  it('getMemoryThumbUrl prefers thumb, falls back to url', () => {
    expect(getMemoryThumbUrl(multi)).toBe('https://x.com/1_t.jpg')
    expect(getMemoryThumbUrl({ photos: [{ url: 'https://x.com/n.jpg' }] })).toBe('https://x.com/n.jpg')
  })

  it('memoryHasPhoto is false for empty or all-pending posts', () => {
    expect(memoryHasPhoto({})).toBe(false)
    expect(memoryHasPhoto({ photos: [{ url: '' }] })).toBe(false)
    expect(memoryHasPhoto(legacy)).toBe(true)
    expect(memoryHasPhoto(multi)).toBe(true)
  })
})
